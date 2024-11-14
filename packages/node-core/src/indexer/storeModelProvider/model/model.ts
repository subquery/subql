// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldsExpression, GetOptions} from '@subql/types-core';
import {Op, Model, ModelStatic, Transaction, CreationAttributes, Sequelize} from '@subql/x-sequelize';
import {Fn} from '@subql/x-sequelize/types/utils';
import _, {cloneDeep} from 'lodash';
import {getFullOptions, operatorsMap} from './utils';

export type BaseEntity = {id: string; __block_range?: (number | null)[] | Fn};

export interface IModel<T extends BaseEntity> {
  get(id: string, tx?: Transaction): Promise<T | undefined>;

  getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>, tx?: Transaction): Promise<T[]>;

  set: (id: string, data: T, blockHeight: number, tx?: Transaction) => Promise<void>;
  bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void>;
  bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void>;

  bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void>;
}

// All operations must be carried out within a transaction.
export class PlainModel<T extends BaseEntity = BaseEntity> implements IModel<T> {
  // Record the data that was first created in the current transaction.
  private currentTxCreatedRecord: Record<string, T> = {};

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true
  ) {}

  private isCurrentTxCreated(id: string, tx?: Transaction): boolean {
    if (!tx) return false;
    return !!this.currentTxCreatedRecord[id];
  }

  private filterCurrentTxCreatedRecord(ids: string[]): string[] {
    return ids.filter((id) => this.currentTxCreatedRecord[id]);
  }

  private _setTxCreatedCache(data: T) {
    this.currentTxCreatedRecord[data.id] = cloneDeep(data);
  }

  clearCurrentTxCreatedRecord() {
    this.currentTxCreatedRecord = {};
  }

  // Only perform bulk create data, without paying attention to any exception situations.
  private async _bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!data.length) return;

    const uniqueMap = data.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, T>
    );
    const waitCreateDatas = Object.values(uniqueMap);

    await this.model.bulkCreate(
      waitCreateDatas.map((v) => ({
        ...v,
        __block_range: this.historical ? [blockHeight, null] : null,
      })) as CreationAttributes<Model<T, T>>[],
      {
        transaction: tx,
        updateOnDuplicate: Object.keys(data[0]) as unknown as (keyof T)[],
      }
    );

    for (const item of waitCreateDatas) {
      this._setTxCreatedCache(item);
    }
  }

  async get(id: string, tx: Transaction): Promise<T | undefined> {
    // Check if the record is in the current transaction
    if (this.currentTxCreatedRecord[id]) return this.currentTxCreatedRecord[id];

    const record = await this.model.findOne({
      // https://github.com/sequelize/sequelize/issues/15179
      where: {id} as any,
      transaction: tx,
    });

    return record?.toJSON();
  }

  async getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>, tx: Transaction): Promise<T[]> {
    const fullOptions = getFullOptions(options);
    // Query DB with all params
    const records = await this.model.findAll({
      where: {
        [Op.and]: [...filters.map(([field, operator, value]) => ({[field]: {[operatorsMap[operator]]: value}}))] as any, // Types not working properly
      },
      limit: fullOptions.limit,
      offset: fullOptions.offset,
      order: [[fullOptions.orderBy as string, fullOptions.orderDirection]],
      transaction: tx,
    });

    return records.map((r) => r.toJSON());
  }

  async set(id: string, data: T, blockHeight: number, tx?: Transaction): Promise<void> {
    if (id !== data.id) {
      throw new Error(`Id doesnt match with data`);
    }

    if (!this.historical) {
      return this._bulkCreate([data], blockHeight, tx);
    }

    if (!this.isCurrentTxCreated(id, tx)) {
      await this._setEndBlockRange([id], blockHeight, tx);
      await this._bulkCreate([data], blockHeight, tx);
      return;
    }

    // TODO Why is there an additional “store” field?
    if (_.isEqual(data, this.currentTxCreatedRecord[id])) return;

    await this.model.update(data, {
      hooks: false,
      where: {
        id: id,
        __block_range: {[Op.contains]: blockHeight},
      } as any,
      transaction: tx,
    });
    this._setTxCreatedCache(data);
  }

  async bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!data.length) return;

    const uniqueMap = data.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, T>
    );
    const waitCreateDatas = Object.values(uniqueMap);

    if (!this.historical) {
      await this._bulkCreate(waitCreateDatas, blockHeight, tx);
      return;
    }

    await this.bulkUpdate(waitCreateDatas, blockHeight, undefined, tx);
  }

  async bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void> {
    if (!data.length) return;

    //TODO, understand why this happens, its also on the store cache
    if (fields) {
      throw new Error(`Currently not supported: update by fields`);
    }

    if (!this.historical) {
      await this._bulkCreate(data, blockHeight, tx);
      return;
    }

    const currentBlockCreatedIds = this.filterCurrentTxCreatedRecord(data.map((v) => v.id));
    const deleteIds: string[] = [];
    data.map((v) => {
      if (currentBlockCreatedIds.includes(v.id)) {
        deleteIds.push(v.id);
      }
    });
    if (deleteIds.length) {
      await this.model.destroy({
        where: {
          id: deleteIds,
          __block_range: {[Op.contains]: blockHeight},
        } as any,
        transaction: tx,
      });
    }

    await this._setEndBlockRange(
      data.map((v) => v.id),
      blockHeight,
      tx
    );
    await this._bulkCreate(data, blockHeight, tx);
  }

  async bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!ids.length) return;
    if (!this.historical) {
      await this.model.destroy({where: {id: ids} as any, transaction: tx});
      return;
    }
    await this._setEndBlockRange(ids, blockHeight, tx);
  }

  private get sequelize(): Sequelize {
    const sequelize = this.model.sequelize;

    if (!sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    return sequelize;
  }

  private async _setEndBlockRange(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
    await this.model.update(
      {
        __block_range: this.sequelize.fn(
          'int8range',
          this.sequelize.fn('lower', this.sequelize.col('_block_range')),
          blockHeight
        ),
      } as any,
      {
        hooks: false,
        where: {
          id: ids,
          __block_range: {[Op.contains]: blockHeight},
        } as any,
        transaction: tx,
      }
    );
  }
}
