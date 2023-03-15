// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {flatten, includes, isEqual, uniq} from 'lodash';
import {CreationAttributes, Model, ModelStatic, Op, Transaction} from 'sequelize';
import {CountOptions} from 'sequelize/types/model';
import {Fn} from 'sequelize/types/utils';
import {
  GetValue,
  HistoricalModel,
  ICachedModelControl,
  RemoveValue,
  SetData,
  ICachedModel,
  SetValueModel,
} from './types';

export class CachedModel<
  T extends {id: string; __block_range?: (number | null)[] | Fn} = {id: string; __block_range?: (number | null)[] | Fn}
> implements ICachedModel<T>, ICachedModelControl<T>
{
  // Null value indicates its not defined in the db
  private getCache: Record<string, GetValue<T>> = {};

  private setCache: SetData<T> = {};

  private removeCache: Record<string, RemoveValue> = {};

  constructor(readonly model: ModelStatic<Model<T, T>>, private readonly historical = true) {}

  private get historicalModel(): ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>> {
    return this.model as ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>>;
  }

  allCachedIds(): string[] {
    // unified ids
    // Don't need to get from setCache, as it is synced with setCache
    return uniq(flatten([Object.keys(this.getCache), Object.keys(this.removeCache)]));
  }

  async get(id: string, tx: Transaction): Promise<T | null> {
    // If this already been removed
    if (this.removeCache[id]) {
      return;
    }
    if (this.getCache[id] === undefined) {
      const record = await this.model.findOne({
        // https://github.com/sequelize/sequelize/issues/15179
        where: {id} as any,
        transaction: tx,
      });

      this.getCache[id] = {
        data: record?.toJSON<T>(),
      };
    }
    return this.getCache[id].data;
  }

  async getByField(
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    tx: Transaction,
    options: {offset?: number; limit?: number} | undefined
  ): Promise<T[] | undefined> {
    let cachedData = this.getByFieldFromCache(field, value);
    if (options?.offset) {
      if (cachedData.length <= options.offset) {
        // example cache length 16, offset is 30
        // it should skip cache value
        cachedData = [];
      } else if (cachedData.length > options.offset + options.limit) {
        // example cache length 166, offset is 30, limit is 50
        // then return all from cache [30,80]
        return cachedData.slice(options.offset, options.offset + options.limit);
      } else if (cachedData.length < options.offset + options.limit) {
        // example cache length 66, offset is 30, limit is 50
        // then return [30,66] from cache, set new limit and join record from db
        cachedData = cachedData.slice(options.offset, cachedData.length);
        options.limit = options.limit - (cachedData.length - options.offset);
      }
    }
    const records = await this.model.findAll({
      where: {[field]: value, id: {[Op.notIn]: this.allCachedIds}} as any,
      transaction: tx,
      limit: options?.limit, //limit should pass from store
      offset: options?.offset,
    });

    // Update getCache value here
    records.map((record) => {
      const data = record.toJSON<T>();
      this.getCache[data.id] = {data};
    });

    const joinedData = cachedData.concat(records.map((record) => record.toJSON() as T));
    return joinedData;
  }

  async getOneByField(field: keyof T, value: T[keyof T], tx: Transaction): Promise<T | undefined> {
    // Might likely be more efficient than use getByField[0]
    if (field === 'id') {
      return this.get(value.toString(), tx);
    } else {
      const oneFromCached = this.getByFieldFromCache(field, value)[0];
      if (oneFromCached) {
        return oneFromCached;
      } else {
        const record = (
          await this.model.findOne({
            where: {[field]: value, id: {[Op.notIn]: this.allCachedIds}} as any,
            transaction: tx,
          })
        )?.toJSON<T>();
        this.getCache[record.id] = {
          data: record,
        };
        return record;
      }
    }
  }

  set(id: string, data: T, blockHeight: number): void {
    if (this.setCache[id] === undefined) {
      this.setCache[id] = new SetValueModel();
    }
    this.setCache[id].set(data, blockHeight);
    // IMPORTANT
    // This sync getCache with setCache
    // Change this will impact `getByFieldFromCache`, `allCachedIds` and related methods.
    this.getCache[id] = {data};
  }

  bulkCreate(data: T[], blockHeight: number): void {
    for (const entity of data) {
      this.set(entity.id, entity, blockHeight);
    }
  }

  bulkUpdate(data: T[], blockHeight: number, fields?: string[] | undefined): void {
    for (const entity of data) {
      this.set(entity.id, entity, blockHeight);
    }
    //TODO, remove fields
    if (fields) {
      throw new Error(`Currently not support update by fields`);
    }
  }

  async count(
    field?: keyof T | undefined,
    value?: T[keyof T] | T[keyof T][] | undefined,
    options?: {distinct?: boolean; col?: keyof T} | undefined
  ): Promise<number> {
    const countOption = {} as Omit<CountOptions<any>, 'group'>;
    let cachedCount = 0;
    if (field && value) {
      const cachedData = this.getByFieldFromCache(field, value);
      const cachedDataIds = Object.values(cachedData).map((data) => data.id);
      cachedCount = cachedDataIds.length;
      // count should exclude any id already existed in cache
      countOption.where = cachedCount !== 0 ? {[field]: value, id: {[Op.notIn]: cachedDataIds}} : {[field]: value};
    }
    //TODO, this seems not working with field and values
    if (options) {
      assert.ok(options.distinct && options.col, 'If distinct, the distinct column must be provided');
      countOption.distinct = options?.distinct;
      countOption.col = options?.col as string;
    }
    return cachedCount + (await this.model.count(countOption));
  }

  remove(id: string, blockHeight: number): void {
    if (this.removeCache[id] === undefined) {
      this.removeCache[id] = {
        removedAtBlock: blockHeight,
      };
      if (this.getCache[id]) {
        delete this.getCache[id];
        // Also when .get, check removeCache first, should return undefined if removed
      }
      if (this.setCache[id]) {
        // close last record
        this.setCache[id].markAsRemoved(blockHeight);
      }
    }
    //else, this already been removed, do nothing
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length;
  }

  async flush(tx: Transaction): Promise<void> {
    const records = flatten(
      Object.values(this.setCache).map((v) => {
        if (!this.historical) {
          return v.getLatest().data;
        }
        // Historical
        return v.getValues().map((historicalValue) => {
          // Alternative: historicalValue.data.__block_range = [historicalValue.startHeight, historicalValue.endHeight];
          historicalValue.data.__block_range = this.model.sequelize.fn(
            'int8range',
            historicalValue.startHeight,
            historicalValue.endHeight
          );
          return historicalValue.data;
        });
      })
    ) as unknown as CreationAttributes<Model<T, T>>[];
    if (this.historical) {
      await Promise.all([
        // set, bulkCreate, bulkUpdate & remove close previous records
        this.historicalMarkPreviousHeightRecordsBatch(tx),
        // bulkCreate all new records for this entity,
        // include(set, bulkCreate, bulkUpdate)
        this.model.bulkCreate(records, {
          transaction: tx,
        }),
      ]);
    } else {
      await this.model.bulkCreate(records, {
        transaction: tx,
        updateOnDuplicate: Object.keys(records[0]) as unknown as (keyof T)[], // TODO is this right? we want upsert behaviour
      });
      await this.model.destroy({where: {id: Object.keys(this.removeCache)} as any, transaction: tx});
    }
  }

  clear(): void {
    this.getCache = {};
    this.setCache = {};
    this.removeCache = {};
  }

  dumpSetData(): SetData<T> {
    const setData = this.setCache;

    this.setCache = {};
    return this.setCache;
  }

  sync(data: SetData<T>) {
    Object.entries(data).map(([id, enttity]) => {
      // TODO update for historical
      this.setCache[id] = enttity;
    });
  }

  private getByFieldFromCache(field: keyof T, value: T[keyof T] | T[keyof T][]): T[] {
    // As getCache always synced the latest record with setCache, from `set` method
    // We only set getCache here, otherwise we need to search setCache.
    return Object.entries(this.getCache).map(([, getValue]) => {
      if ((Array.isArray(value) && includes(value, getValue.data[field])) || isEqual(getValue.data[field], value)) {
        return getValue.data;
      }
    });
  }

  // Different with markAsDeleted, we only mark/close all the records less than current block height
  // thus, and new record with current block height will not be impacted,
  // advantage is this sql is safe to concurrency resolve with any insert sql
  private async historicalMarkPreviousHeightRecordsBatch(tx: Transaction): Promise<any[]> {
    const closeSetRecords = Object.entries(this.setCache).map(([id, value]) => {
      return {id, blockHeight: value.getFirst().startHeight};
    });
    const closeRemoveRecords = Object.entries(this.removeCache).map(([id, value]) => {
      return {id, blockHeight: value.removedAtBlock};
    });

    const mergedRecords = closeSetRecords.concat(closeRemoveRecords);

    return Promise.all(
      mergedRecords.map(({blockHeight, id}) => {
        this.historicalModel.update(
          {
            __block_range: this.model.sequelize.fn(
              'int8range',
              this.model.sequelize.fn('lower', this.model.sequelize.col('_block_range')),
              blockHeight
            ),
          },
          {
            hooks: false,
            transaction: tx,
            // https://github.com/sequelize/sequelize/issues/15179
            where: {
              id,
              __block_range: {
                [Op.contains]: (blockHeight - 1) as any,
              },
            } as any,
          }
        );
      })
    );
  }
}
