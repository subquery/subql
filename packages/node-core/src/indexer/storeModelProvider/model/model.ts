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

    await this.bulkUpdate([data], blockHeight, undefined, tx);
  }

  async bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void> {
    await this.bulkUpdate(data, blockHeight, undefined, tx);
  }

  async bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void> {
    if (!data.length) return;

    // TODO, understand why this happens, its also on the store cache
    if (fields) {
      throw new Error(`Currently not supported: update by fields`);
    }

    const uniqueMap = data.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, T>
    );
    const uniqueDatas = Object.values(uniqueMap);

    if (!this.historical) {
      await this._bulkCreate(uniqueDatas, blockHeight, tx);
      return;
    }

    const deleteIds: string[] = [];
    const createDatas: T[] = [];
    for (const item of uniqueDatas) {
      const currentTxCreatedRecord = this.currentTxCreatedRecord[item.id];
      // If the data is not created in the current transaction, it is created.
      if (!currentTxCreatedRecord) {
        createDatas.push(item);
        continue;
      }
      // If the data is created in the current transaction and the data is the same, it is ignored.
      // TODO Why is there an additional “store” field?
      if (_.isEqual(item, currentTxCreatedRecord)) continue;

      // If the data is created in the current transaction, but the data is different, it is deleted and re-created.
      deleteIds.push(item.id);
      createDatas.push(item);
    }

    if (deleteIds.length) {
      // Delete the data that was created in the current transaction
      await this.model.destroy({
        where: {
          id: deleteIds,
          __block_range: {[Op.contains]: blockHeight},
        } as any,
        transaction: tx,
      });
    }

    await this._setEndBlockRange(
      createDatas.map((v) => v.id),
      blockHeight,
      tx
    );
    await this._bulkCreate(createDatas, blockHeight, tx);
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
