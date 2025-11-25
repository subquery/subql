// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldsExpression, GetOptions} from '@subql/types-core';
import {Op, Model, ModelStatic, Transaction, CreationAttributes, Sequelize} from '@subql/x-sequelize';
import {Fn} from '@subql/x-sequelize/types/utils';
import {HistoricalMode} from '../../types';
import {asTxExporter, Exporter, TransactionedExporter} from '../exporters';
import {getFullOptions, operatorsMap} from './utils';

export type BaseEntity = {id: string; __block_range?: (number | null)[] | Fn};

export interface IModel<T extends BaseEntity> {
  model: Readonly<ModelStatic<Model<T, T>>>;
  get(id: string, tx?: Transaction): Promise<T | undefined>;

  getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>, tx?: Transaction): Promise<T[]>;

  set: (id: string, data: T, blockHeight: number, tx?: Transaction) => Promise<void>;
  bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void>;
  bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void>;

  bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void>;

  exporters: Exporter[];
}

// All operations must be carried out within a transaction.
export class PlainModel<T extends BaseEntity = BaseEntity> implements IModel<T> {
  exporters: TransactionedExporter[] = [];

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical: HistoricalMode = 'height'
  ) {}

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

    if (this.historical) {
      // To prevent the scenario of repeated created-deleted-created, which may result in multiple entries.
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
    }

    const allKeys = Object.keys(this.model.getAttributes()) as (keyof T)[];
    await this.model.bulkCreate(data as CreationAttributes<Model<T, T>>[], {
      transaction: tx,
      updateOnDuplicate: allKeys,
    });

    if (this.exporters.length) {
      // Include historical information
      const exportData = this.historical ? data.map((d) => ({...d, __block_range: [blockHeight]})) : data;

      await Promise.all(this.exporters.map((exporter) => exporter.export(exportData)));

      // Without a transaction, commit that data instantly
      if (!tx) {
        await Promise.all(this.exporters.map((exporter) => exporter.commit()));
      }
    }
  }

  async bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!ids.length) return;
    if (!this.historical) {
      await this.model.destroy({where: {id: ids} as any, transaction: tx});
    } else {
      await this.markAsDeleted(ids, blockHeight, tx);
    }
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

  addExporter(exporter: Exporter): void {
    this.exporters.push(asTxExporter(exporter));
  }
}
