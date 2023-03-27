// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {flatten, includes, isEqual, uniq} from 'lodash';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from 'sequelize';
import {CountOptions} from 'sequelize/types/model';
import {Fn} from 'sequelize/types/utils';
import {NodeConfig} from '../../configure';
import {
  HistoricalModel,
  ICachedModelControl,
  RemoveValue,
  SetData,
  ICachedModel,
  SetValueModel,
  GetData,
} from './types';

const getCacheOptions = {
  max: 500, // default value
  ttl: 1000 * 60 * 60, // in ms
  updateAgeOnGet: true, // we want to keep most used record in cache longer
};

export class CachedModel<
  T extends {id: string; __block_range?: (number | null)[] | Fn} = {id: string; __block_range?: (number | null)[] | Fn}
> implements ICachedModel<T>, ICachedModelControl
{
  // Null value indicates its not defined in the db
  private getCache: GetData<T>;

  private setCache: SetData<T> = {};

  private removeCache: Record<string, RemoveValue> = {};

  flushableRecordCounter = 0;

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true,
    private config: NodeConfig
  ) {
    // In case, this might be want to be 0
    if (this.config.storeGetCacheSize !== undefined) {
      getCacheOptions.max = this.config.storeGetCacheSize;
    }
    this.getCache = new GetData<T>(getCacheOptions);
  }

  private get historicalModel(): ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>> {
    return this.model as ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>>;
  }

  allCachedIds(): string[] {
    // unified ids
    // We need to look from setCache too, as setCache is LFU cache, it might have more/fewer entities with setCache
    return uniq(flatten([[...this.getCache.keys()], Object.keys(this.setCache), Object.keys(this.removeCache)]));
  }

  async get(id: string): Promise<T | null> {
    // If this already been removed
    if (this.removeCache[id]) {
      return;
    }
    if (!this.getCache.has(id)) {
      // LFU getCache could remove record from due to it is least frequently used
      // Then we try look from setCache
      let record = this.setCache[id]?.getLatest().data;
      if (!record) {
        record = (
          await this.model.findOne({
            // https://github.com/sequelize/sequelize/issues/15179
            where: {id} as any,
          })
        )?.toJSON<T>();
        // getCache only keep records from db
        this.getCache.set(id, record);
      }
      return record;
    }

    return this.getCache.get(id);
  }

  async getByField(
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: {
      offset: number;
      limit: number;
    }
  ): Promise<T[] | undefined> {
    let cachedData = this.getFromCache(field, value);
    if (cachedData.length <= options.offset) {
      // example cache length 16, offset is 30
      // it should skip cache value
      cachedData = [];
    } else if (cachedData.length >= options.offset + options.limit) {
      // example cache length 166, offset is 30, limit is 50
      // then return all from cache [30,80]
      return cachedData.slice(options.offset, options.offset + options.limit);
    } else if (cachedData.length < options.offset + options.limit) {
      // example cache length 66, offset is 30, limit is 50
      // then return [30,66] from cache, set new limit and join record from db
      cachedData = cachedData.slice(options.offset, cachedData.length);
      options.limit = options.limit - (cachedData.length - options.offset);
    }

    const records = await this.model.findAll({
      where: {[field]: value, id: {[Op.notIn]: this.allCachedIds()}} as any,
      limit: options?.limit, //limit should pass from store
      offset: options?.offset,
    });

    // Update getCache value here
    records.map((record) => {
      const data = record.toJSON<T>();
      this.getCache.set(data.id, data);
    });

    const joinedData = cachedData.concat(records.map((record) => record.toJSON() as T));
    return joinedData;
  }

  async getOneByField(field: keyof T, value: T[keyof T]): Promise<T | undefined> {
    if (field === 'id') {
      return this.get(value.toString());
    } else {
      const oneFromCached = this.getFromCache(field, value, true)[0];
      if (oneFromCached) {
        return oneFromCached;
      } else {
        const record = (
          await this.model.findOne({
            where: {[field]: value, id: {[Op.notIn]: this.allCachedIds()}} as any,
          })
        )?.toJSON<T>();

        this.getCache.set(record.id, record);
        return record;
      }
    }
  }

  set(id: string, data: T, blockHeight: number): void {
    if (this.setCache[id] === undefined) {
      this.setCache[id] = new SetValueModel();
    }
    this.setCache[id].set(data, blockHeight);
    this.getCache.set(id, data);
    this.flushableRecordCounter += 1;
  }

  bulkCreate(data: T[], blockHeight: number): void {
    for (const entity of data) {
      this.set(entity.id, entity, blockHeight);
    }
  }

  bulkUpdate(data: T[], blockHeight: number, fields?: string[] | undefined): void {
    //TODO, remove fields
    if (fields) {
      throw new Error(`Currently not supported: update by fields`);
    }
    for (const entity of data) {
      this.set(entity.id, entity, blockHeight);
    }
  }

  async count(
    field?: keyof T | undefined,
    value?: T[keyof T] | T[keyof T][] | undefined,
    options?: {distinct?: boolean; col?: keyof T} | undefined
  ): Promise<number> {
    const countOption = {} as Omit<CountOptions<any>, 'group'>;

    const cachedData = this.getFromCache(field, value);
    // count should exclude any id already existed in cache
    countOption.where =
      cachedData.length !== 0 ? {[field]: value, id: {[Op.notIn]: this.allCachedIds()}} : {[field]: value};

    //TODO, this seems not working with field and values
    if (options) {
      assert.ok(options.distinct && options.col, 'If distinct, the distinct column must be provided');
      countOption.distinct = options.distinct;
      countOption.col = options.col as string;
    }
    return cachedData.length + (await this.model.count(countOption));
  }

  remove(id: string, blockHeight: number): void {
    if (this.removeCache[id] === undefined) {
      this.removeCache[id] = {
        removedAtBlock: blockHeight,
      };
      this.flushableRecordCounter += 1;
      if (this.getCache.get(id)) {
        this.getCache.delete(id);
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

  async flush(tx: Transaction, blockHeight?: number): Promise<void> {
    // Get records relevant to the block height
    const setRecords = blockHeight
      ? Object.entries(this.setCache).reduce((acc, [key, value]) => {
          const newValue = value.fromBelowHeight(blockHeight + 1);
          if (newValue.getValues().length) {
            acc[key] = newValue;
          }
          return acc;
        }, {} as SetData<T>)
      : this.setCache;

    const removeRecords = blockHeight
      ? Object.entries(this.removeCache).reduce((acc, [key, value]) => {
          if (value.removedAtBlock <= blockHeight) {
            acc[key] = value;
          }

          return acc;
        }, {} as Record<string, RemoveValue>)
      : this.removeCache;

    const records = flatten(
      Object.values(setRecords).map((v) => {
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

    let dbOperation: Promise<unknown>;
    if (this.historical) {
      dbOperation = Promise.all([
        // set, bulkCreate, bulkUpdate & remove close previous records
        this.historicalMarkPreviousHeightRecordsBatch(tx, setRecords, removeRecords),
        // bulkCreate all new records for this entity,
        // include(set, bulkCreate, bulkUpdate)
        this.model.bulkCreate(records, {
          transaction: tx,
        }),
      ]);
    } else {
      dbOperation = Promise.all([
        this.model.bulkCreate(records, {
          transaction: tx,
          updateOnDuplicate: Object.keys(records[0]) as unknown as (keyof T)[], // TODO is this right? we want upsert behaviour
        }),
        this.model.destroy({where: {id: Object.keys(removeRecords)} as any, transaction: tx}),
      ]);
    }

    // Don't await DB operations to complete before clearing.
    // This allows new data to be cached while flushing
    this.clear(blockHeight);

    await dbOperation;
  }

  private clear(blockHeight?: number): void {
    if (!blockHeight) {
      this.setCache = {};
      this.removeCache = {};
      this.flushableRecordCounter = 0;
      return;
    }

    let newCounter = 0;

    // Clear everything below the block height
    this.setCache = Object.entries(this.setCache).reduce((acc, [key, value]) => {
      const newValue = value.fromAboveHeight(blockHeight);
      const numValues = newValue.getValues().length;
      if (numValues) {
        newCounter += numValues;
        acc[key] = value.fromAboveHeight(blockHeight);
      }
      return acc;
    }, {} as SetData<T>);

    this.removeCache = Object.entries(this.removeCache).reduce((acc, [key, value]) => {
      if (value.removedAtBlock > blockHeight) {
        newCounter++;
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, RemoveValue>);

    this.flushableRecordCounter = newCounter;
  }

  // If field and value are passed, will getByField
  // If no input parameter, will getAll
  private getFromCache(field?: keyof T, value?: T[keyof T] | T[keyof T][], findOne?: boolean): T[] {
    const joinedData: T[] = [];
    const unifiedIds: string[] = [];
    Object.entries(this.setCache).map(([, model]) => {
      if (model.isMatchData(field, value)) {
        const latestData = model.getLatest().data;
        unifiedIds.push(latestData.id);
        joinedData.push(latestData);
      }
    });
    // No need search further
    if (findOne && joinedData.length !== 0) {
      return joinedData;
    }

    this.getCache.forEach((getValue, key) => {
      if (
        !unifiedIds.includes(key) &&
        ((field === undefined && value === undefined) ||
          (Array.isArray(value) && includes(value, getValue[field])) ||
          isEqual(getValue[field], value))
      ) {
        // increase recency with get
        joinedData.push(this.getCache.get(key));
      }
    });
    return joinedData;
  }

  // Different with markAsDeleted, we only mark/close all the records less than current block height
  // thus, and new record with current block height will not be impacted,
  // advantage is this sql is safe to concurrency resolve with any insert sql
  private async historicalMarkPreviousHeightRecordsBatch(
    tx: Transaction,
    setRecords: SetData<T>,
    removeRecords: Record<string, RemoveValue>
  ): Promise<void> {
    const closeSetRecords = Object.entries(setRecords).map(([id, value]) => {
      return {id, blockHeight: value.getFirst().startHeight};
    });
    const closeRemoveRecords = Object.entries(removeRecords).map(([id, value]) => {
      return {id, blockHeight: value.removedAtBlock};
    });
    const mergedRecords = closeSetRecords.concat(closeRemoveRecords);

    if (!mergedRecords.length) {
      return;
    }

    await this.model.sequelize.query(
      `UPDATE ${this.model.getTableName()} table1 SET _block_range = int8range(lower("_block_range"), table2._block_end)
            from (SELECT UNNEST(array[${mergedRecords.map((r) =>
              this.model.sequelize.escape(r.id)
            )}]) AS id, UNNEST(array[${mergedRecords.map((r) => r.blockHeight)}]) AS _block_end) AS table2
            WHERE table1.id = table2.id and "_block_range" @> _block_end-1::int8;`,
      {transaction: tx}
    );
  }
}
