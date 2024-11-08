// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {FieldsExpression, GetOptions} from '@subql/types-core';
import {Op, Model, ModelStatic, Transaction, CreationAttributes, Sequelize} from '@subql/x-sequelize';
import {Fn} from '@subql/x-sequelize/types/utils';
import {getFullOptions, operatorsMap} from './utils';

export type BaseEntity = {id: string; __block_range?: (number | null)[] | Fn};

export interface IModel<T extends BaseEntity> {
  get(id: string): Promise<T | undefined>;

  getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>): Promise<T[]>;

  set: (id: string, data: T, blockHeight: number, tx?: Transaction) => Promise<void>;
  bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void>;
  bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void>;

  bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void>;
}

export class PlainModel<T extends BaseEntity = BaseEntity> implements IModel<T> {
  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true
  ) {}

  async get(id: string): Promise<T | undefined> {
    const record = await this.model.findOne({
      // https://github.com/sequelize/sequelize/issues/15179
      where: {id} as any,
    });

    return record?.toJSON();
  }

  async getByFields(filters: FieldsExpression<T>[], options: GetOptions<T>): Promise<T[]> {
    const fullOptions = getFullOptions(options);
    // Query DB with all params
    const records = await this.model.findAll({
      where: {
        [Op.and]: [...filters.map(([field, operator, value]) => ({[field]: {[operatorsMap[operator]]: value}}))] as any, // Types not working properly
      },
      limit: fullOptions.limit,
      offset: fullOptions.offset,
      order: [[fullOptions.orderBy as string, fullOptions.orderDirection]],
    });

    return records.map((r) => r.toJSON());
  }

  async set(id: string, data: T, blockHeight: number, tx?: Transaction): Promise<void> {
    if (id !== data.id) {
      throw new Error(`Id doesnt match with data`);
    }

    await this.bulkCreate([data], blockHeight, tx);
  }

  async bulkCreate(data: T[], blockHeight: number, tx?: Transaction): Promise<void> {
    if (!data.length) {
      return;
    }
    await this.model.bulkCreate(
      data.map((v) => ({
        ...v,
        __block_range: this.historical ? this.sequelize.fn('int8range', blockHeight, null) : null,
      })) as CreationAttributes<Model<T, T>>[],
      {
        transaction: tx,
        updateOnDuplicate: Object.keys(data[0]) as unknown as (keyof T)[],
      }
    );
  }

  async bulkUpdate(data: T[], blockHeight: number, fields?: string[], tx?: Transaction): Promise<void> {
    //TODO, understand why this happens, its also on the store cache
    if (fields) {
      throw new Error(`Currently not supported: update by fields`);
    }
    await this.bulkCreate(data, blockHeight, tx);
  }

  async bulkRemove(ids: string[], blockHeight: number, tx?: Transaction): Promise<void> {
    await this.model.destroy({where: {id: ids} as any, transaction: tx});
  }

  private get sequelize(): Sequelize {
    const sequelize = this.model.sequelize;

    if (!sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    return sequelize;
  }
}
