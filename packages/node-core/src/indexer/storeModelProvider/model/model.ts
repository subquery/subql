// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldsExpression, GetOptions} from '@subql/types-core';
import {Op, Model, ModelStatic, Transaction, CreationAttributes, Sequelize} from '@subql/x-sequelize';
import {Fn} from '@subql/x-sequelize/types/utils';
import _ from 'lodash';
import {CsvStoreService} from '../csvStore.service';
import {Exporter} from '../types';
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
  private exporters: Exporter[] = [];

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true
  ) {}

  // Only perform bulk create data, without paying attention to any exception situations.
  private async _bulkCreate(data: T[], tx?: Transaction): Promise<void> {
    if (!data.length) return;

    const uniqueMap = data.reduce(
      (acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      },
      {} as Record<string, T>
    );
    const waitCreateDatas = Object.values(uniqueMap);

    await this.model.bulkCreate(waitCreateDatas as CreationAttributes<Model<T, T>>[], {
      transaction: tx,
      updateOnDuplicate: Object.keys(data[0]) as unknown as (keyof T)[],
    });

    if (tx) {
      this.exporters.forEach((store: Exporter) => {
        tx.afterCommit(async () => {
          await store.export(data);
        });
      });
    } else {
      Promise.all(this.exporters.map(async (store: Exporter) => store.export(data)));
    }
  }

  async get(id: string, tx?: Transaction): Promise<T | undefined> {
    const record = await this.model.findOne({
      // https://github.com/sequelize/sequelize/issues/15179
      where: {id} as any,
      transaction: tx,
    });

    return record?.toJSON();
  }

  async getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>, tx?: Transaction): Promise<T[]> {
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

    if (!this.historical) {
      await this._bulkCreate(data, tx);
      return;
    }

    await this.model.destroy({
      where: {
        id: data.map((v) => v.id),
        [Op.and]: this.sequelize.where(
          this.sequelize.fn('lower', this.sequelize.col('_block_range')),
          Op.eq,
          blockHeight
        ),
      } as any,
      transaction: tx,
    });
    await this.markAsDeleted(
      data.map((v) => v.id),
      blockHeight,
      tx
    );
    await this._bulkCreate(data, tx);
  }

  async bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!ids.length) return;
    if (!this.historical) {
      await this.model.destroy({where: {id: ids} as any, transaction: tx});
      return;
    }
    await this.markAsDeleted(ids, blockHeight, tx);
  }

  private get sequelize(): Sequelize {
    const sequelize = this.model.sequelize;

    if (!sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    return sequelize;
  }

  private async markAsDeleted(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
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

  addExporterStore(exporter: CsvStoreService): void {
    this.exporters.push(exporter);
  }
}
