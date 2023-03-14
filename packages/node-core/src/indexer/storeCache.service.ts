// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {flatten, isEqual, includes} from 'lodash';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from 'sequelize';
import {CountOptions} from 'sequelize/types/model';
import {Fn} from 'sequelize/types/utils';
import {NodeConfig} from '../configure';

const FLUSH_FREQUENCY = 5;

interface ICachedModel<T> {
  count: (
    field?: keyof T,
    value?: T[keyof T] | T[keyof T][],
    options?: {distinct?: boolean; col?: keyof T}
  ) => Promise<number>;
  get: (id: string, tx: Transaction) => Promise<T | null>;
  // limit always defined from store
  getByField: (
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    tx: Transaction,
    options?: {limit: number; offset?: number}
  ) => Promise<T[] | undefined>;
  getOneByField: (field: keyof T, value: T[keyof T], tx: Transaction) => Promise<T | undefined>;
  set: (id: string, data: T, blockHeight: number) => void;
  bulkCreate: (data: T[], blockHeight: number) => void;
  bulkUpdate: (data: T[], blockHeight: number, fields?: string[]) => void;
  remove: (id: string, blockHeight: number) => void;
}

interface ICachedModelControl<T> {
  isFlushable: boolean;

  sync(data: SetData<T>): void;
  flush(tx: Transaction): Promise<void>;
  dumpSetData(): SetData<T>;
  clear(): void;
}

export type EntitySetData = Record<string, SetData<any>>;

type GetValue<T> = {
  // Null value indicates its not defined in the db
  data: T | null;
  // Future-proof to allow meta for clearing cache
};

type RemoveValue<T> = {
  removedAtBlock: number;
};

type SetValue<T> = {
  data: T;
  startHeight: number;
  endHeight: number | null;
};

type SetData<T> = Record<string, SetValueModel<T>>;

type HistoricalModel = {__block_range: any};

class SetValueModel<T> {
  private historicalValues: SetValue<T>[] = [];
  private _latestIndex = -1;

  create(data: T, blockHeight: number) {
    this.historicalValues.push({data, startHeight: blockHeight, endHeight: null});
    this._latestIndex += 1;
  }

  set(data: T, blockHeight: number) {
    const latestIndex = this.latestIndex();

    if (latestIndex >= 0) {
      // Set multiple time within same block, replace with input data only
      if (this.historicalValues[latestIndex].startHeight === blockHeight) {
        this.historicalValues[latestIndex].data = data;
      } else if (this.historicalValues[latestIndex].startHeight > blockHeight) {
        throw new Error(`Can not set record with block height ${blockHeight}`);
      } else {
        this.historicalValues[latestIndex].endHeight = blockHeight;
        this.create(data, blockHeight);
      }
    } else {
      this.create(data, blockHeight);
    }
  }

  latestIndex(): number {
    if (this.historicalValues.length === 0) {
      return -1;
    } else {
      // Expect latestIndex should always sync with array growth
      if (this.historicalValues.length - 1 !== this._latestIndex) {
        this._latestIndex = this.historicalValues.findIndex((value) => value.endHeight === null);
      }
      return this._latestIndex;
    }
  }

  getLatest(): SetValue<T> | undefined {
    const latestIndex = this.latestIndex();
    if (latestIndex === -1) {
      return;
    }
    return this.historicalValues[latestIndex];
  }

  getFirst(): SetValue<T> | undefined {
    return this.historicalValues[0];
  }

  getValues(): SetValue<T>[] {
    return this.historicalValues;
  }

  markAsRemoved(removeAtBlock: number) {
    const latestIndex = this.latestIndex();
    if (latestIndex === -1) {
      return;
    }
    this.historicalValues[latestIndex].endHeight = removeAtBlock;
  }

  isMatchData(field: keyof T, value: T[keyof T] | T[keyof T][]): boolean {
    if (Array.isArray(value)) {
      return value.findIndex((v) => isEqual(this.getLatest().data[field], value)) > -1;
    } else {
      return isEqual(this.getLatest().data[field], value);
    }
  }
}

class CachedModel<
  T extends {id: string; __block_range?: (number | null)[] | Fn} = {id: string; __block_range?: (number | null)[] | Fn}
> implements ICachedModel<T>, ICachedModelControl<T>
{
  // Null value indicates its not defined in the db
  private getCache: Record<string, GetValue<T>> = {};

  private setCache: SetData<T> = {};

  private removeCache: Record<string, RemoveValue<T>> = {};

  constructor(readonly model: ModelStatic<Model<T, T>>, private readonly historical = true) {}

  private get historicalModel(): ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>> {
    return this.model as ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>>;
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
    const cachedDataIds = Object.values(cachedData).map((data) => data?.id);
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
      where: {[field]: value, id: {[Op.notIn]: cachedDataIds}} as any,
      transaction: tx,
      limit: options?.limit, //limit should pass from store
      offset: options?.offset,
    });
    const joinedData = cachedData.concat(records.map((record) => record.toJSON() as T));
    return joinedData;
  }

  async getOneByField(field: keyof T, value: T[keyof T], tx: Transaction): Promise<T | undefined> {
    // Might likely be more efficient than use getByField[0]
    if (field === 'id') {
      return this.get(value.toString(), tx);
    } else {
      const oneFromCached = this.getByFieldFromCache(field, value, true);
      return (
        oneFromCached[0] ??
        ((
          await this.model.findOne({
            where: {[field]: value} as any,
            transaction: tx,
          })
        )?.toJSON() as T)
      );
    }
  }

  set(id: string, data: T, blockHeight: number): void {
    if (this.setCache[id] === undefined) {
      this.setCache[id] = new SetValueModel();
    }
    this.setCache[id].set(data, blockHeight);
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

  private getByFieldFromCache(field: keyof T, value: T[keyof T] | T[keyof T][], findOne?: boolean): T[] {
    const joinedData: T[] = [];
    const unifiedIds: string[] = [];
    if (Object.keys(this.setCache).length !== 0) {
      joinedData.concat(
        Object.entries(this.setCache).map(([, model]) => {
          if (model.isMatchData(field, value)) {
            const latestData = model.getLatest().data;
            unifiedIds.push(latestData.id);
            return latestData;
          }
        })
      );
      // No need search further
      if (findOne && joinedData.length !== 0) {
        return joinedData;
      }
    } else if (Object.keys(this.getCache).length !== 0) {
      joinedData.concat(
        Object.entries(this.getCache).map(([, getValue]) => {
          if (
            // We don't need to include anything duplicated
            (!includes(unifiedIds, getValue.data.id) &&
              Array.isArray(value) &&
              includes(value, getValue.data[field])) ||
            isEqual(getValue.data[field], value)
          ) {
            return getValue.data;
          }
        })
      );
    }
    return joinedData;
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

@Injectable()
export class StoreCacheService {
  historical: boolean;
  private flushCounter: number;
  tx: Transaction;

  private cachedModels: Record<string, CachedModel> = {};

  constructor(private sequelize: Sequelize, private config: NodeConfig) {
    this.resetMemoryStore();
    this.flushCounter = 0;
    this.historical = true; // TODO, need handle when is not historical
  }

  counterIncrement(): void {
    this.flushCounter += 1;
  }

  getModel<T>(entity: string): ICachedModel<T> {
    if (!this.cachedModels[entity]) {
      const model = this.sequelize.model(entity);
      assert(model, `model ${entity} not exists`);

      this.cachedModels[entity] = new CachedModel(model);
    }

    return this.cachedModels[entity] as unknown as ICachedModel<T>;
  }

  // async registryTransaction(): Promise<Transaction> {
  //   this.tx = await this.sequelize.transaction();
  //   this.tx.afterCommit(() => (this.tx = undefined));
  //   return this.tx;
  // }

  // async commitTransaction(): Promise<void> {
  //   await this.tx.commit();
  // }

  dumpSetData(): EntitySetData {
    const res: EntitySetData = {};

    Object.entries(this.cachedModels).map(([entity, model]) => {
      if (model.isFlushable) {
        res[entity] = model.dumpSetData();
      }
    });

    return res;
  }

  private async _flushCache(): Promise<void> {
    if (!this.historical) {
      return;
    }

    // Get models that have data to flush
    const updatableModels = Object.values(this.cachedModels).filter((m) => m.isFlushable);

    await Promise.all(updatableModels.map((model) => model.flush(this.tx)));
  }

  async flushCache(): Promise<void> {
    if (this.isFlushable()) {
      await this._flushCache();
      // Note flushCache and commit transaction need to sequential
      // await this.commitTransaction();
      this.resetMemoryStore();
    }
  }

  syncData(data: EntitySetData): void {
    Object.entries(data).map(([entity, setData]) => {
      (this.getModel(entity) as CachedModel).sync(setData);
    });
  }

  isFlushable(): boolean {
    return this.flushCounter % FLUSH_FREQUENCY === 0;
  }

  resetMemoryStore(): void {
    Object.values(this.cachedModels).map((model) => model.clear());
  }
}
