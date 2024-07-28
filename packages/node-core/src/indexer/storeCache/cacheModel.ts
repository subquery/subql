// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {FieldOperators, FieldsExpression, GetOptions} from '@subql/types-core';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from '@subql/x-sequelize';
import {Fn} from '@subql/x-sequelize/types/utils';
import {flatten, uniq, cloneDeep, orderBy, unionBy} from 'lodash';
import {NodeConfig} from '../../configure';
import {Cacheable} from './cacheable';
import {CsvStoreService} from './csvStore.service';
import {SetValueModel} from './setValueModel';
import {
  ICachedModelControl,
  RemoveValue,
  SetData,
  ICachedModel,
  GetData,
  FilteredHeightRecords,
  SetValue,
  Exporter,
} from './types';

const getCacheOptions = {
  max: 500, // default value
  ttl: 1000 * 60 * 60, // in ms
  updateAgeOnGet: true, // we want to keep most used record in cache longer
};

const operatorsMap: Record<FieldOperators, any> = {
  '=': Op.eq,
  '!=': Op.ne,
  in: Op.in,
  '!in': Op.notIn,
};

const defaultOptions: Required<GetOptions<{id: string}>> = {
  offset: 0,
  limit: 100,
  orderBy: 'id',
  orderDirection: 'ASC',
};

export class CachedModel<
    T extends {id: string; __block_range?: (number | null)[] | Fn} = {
      id: string;
      __block_range?: (number | null)[] | Fn;
    },
  >
  extends Cacheable
  implements ICachedModel<T>, ICachedModelControl
{
  // Null value indicates its not defined in the db
  private getCache: GetData<T>;
  private setCache: SetData<T> = {};
  private removeCache: Record<string, RemoveValue> = {};
  readonly hasAssociations: boolean = false;
  private exporters: Exporter[] = [];

  flushableRecordCounter = 0;

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true,
    config: NodeConfig,
    private getNextStoreOperationIndex: () => number
  ) {
    super();
    // In case, this might be want to be 0
    if (config.storeGetCacheSize !== undefined) {
      getCacheOptions.max = config.storeGetCacheSize;
    }
    this.getCache = new GetData<T>(getCacheOptions);
    if (Object.keys(this.model.associations).length > 0) {
      this.hasAssociations = true;
    }
  }

  allCachedIds(): string[] {
    // unified ids
    // We need to look from setCache too, as setCache is LFU cache, it might have more/fewer entities with setCache
    return uniq(flatten([Object.keys(this.setCache), Object.keys(this.removeCache)]));
  }

  async get(id: string): Promise<T | undefined> {
    // If this already been removed
    const latestSetRecord = this.setCache[id]?.getLatest();

    if (this.removeCache[id]) {
      // Entity has been set again after being removed
      if (
        latestSetRecord &&
        !latestSetRecord.removed &&
        this.removeCache[id].removedAtBlock <= latestSetRecord.startHeight
      ) {
        return cloneDeep(latestSetRecord.data);
      }
      return;
    }
    if (!this.getCache.has(id)) {
      // LFU getCache could remove record from due to it is least frequently used
      // Then we try look from setCache
      let record = latestSetRecord?.data;
      if (latestSetRecord?.removed) {
        return undefined;
      }
      if (!record) {
        await this.mutex.waitForUnlock();
        record = (
          await this.model.findOne({
            // https://github.com/sequelize/sequelize/issues/15179
            where: {id} as any,
          })
        )?.toJSON();
        if (record) {
          // getCache only keep records from db
          this.getCache.set(id, record);
        }
      }
      return cloneDeep(record);
    }

    return cloneDeep(this.getCache.get(id));
  }

  addExporterStore(cacheState: CsvStoreService): void {
    this.exporters.push(cacheState);
  }

  /**
   * getByFields allows ordering and filtering of data from the setCache and DB.
   *
   * When ordering, cache data is provided first followed by DB data, this is to ensure offsets work
   *
   * It does not use the get cache because there is no way to guarantee order,
   * and we have no way to tell where setCache data fits in the order.
   *
   * There is also no way to flush data here,
   * flushing will only flush data before the current block so its still required to consider the setCache
   * */
  async getByFields(filters: FieldsExpression<T>[], options: GetOptions<T> = defaultOptions): Promise<T[]> {
    filters.forEach(([field, operator]) => {
      assert(
        operatorsMap[operator],
        `Operator ('${operator}') for field ${String(field)} is not valid. Options are ${Object.keys(operatorsMap).join(
          ', '
        )}`
      );
    });

    // Dont do anything to return early like checking for a single ID filter.
    // If projects use inefficient store methods, thats on them.

    // Ensure we have all the options
    const fullOptions: Required<GetOptions<T>> = {
      ...defaultOptions,
      ...options,
    };

    await this.mutex.waitForUnlock();

    // Query cache with all params
    // Apply the operations in the same order as the DB would, order -> filter -> offset
    const cacheData = orderBy(
      Object.values(this.setCache),
      [(value: SetValueModel<T>) => value.getLatest()?.data?.[fullOptions.orderBy]],
      [fullOptions.orderDirection.toLowerCase() as 'asc' | 'desc']
    )
      .filter((value) => value.matchesFields(filters)) // This filters out any removed/undefined
      .map((value) => value.getLatest()?.data)
      .map((value) => cloneDeep(value)) as T[];

    const offsetCacheData = cacheData.slice(options.offset);

    // Return early if cache covers all the data
    if (offsetCacheData.length > fullOptions.limit) {
      return offsetCacheData.slice(0, fullOptions.limit);
    }

    // Query DB with all params
    const records = await this.model.findAll({
      where: {
        [Op.and]: [
          ...filters.map(([field, operator, value]) => ({[field]: {[operatorsMap[operator]]: value}})),
          {id: {[Op.notIn]: this.allCachedIds()}},
        ] as any, // Types not working properly
      },
      limit: fullOptions.limit - offsetCacheData.length, // Only get enough to fill the limit
      offset: fullOptions.offset - (cacheData.length - offsetCacheData.length), // Remove the offset items from the cache
      order: [[fullOptions.orderBy as string, fullOptions.orderDirection]],
    });

    const dbData = records.map((r) => r.toJSON());

    // Combine data from cache and db
    const combined = unionBy(offsetCacheData, dbData, (v) => v.id).slice(0, fullOptions.limit); // Re-apply limit

    return combined;
  }

  async getByField(
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: GetOptions<T> = defaultOptions
  ): Promise<T[]> {
    return this.getByFields([Array.isArray(value) ? [field, 'in', value] : [field, '=', value]], options);
  }

  async getOneByField(field: keyof T, value: T[keyof T]): Promise<T | undefined> {
    const [res] = await this.getByField(field, value, {
      ...defaultOptions,
      limit: 1,
    });

    return res;
  }

  set(id: string, data: T, blockHeight: number): void {
    if (this.setCache[id] === undefined) {
      this.setCache[id] = new SetValueModel();
    }
    const copiedData = cloneDeep(data);
    this.setCache[id].set(copiedData, blockHeight, this.getNextStoreOperationIndex());
    // Experimental, this means getCache keeps duplicate data from setCache,
    // we can remove this once memory is too full.
    this.getCache.set(id, copiedData);
    // Handle remove cache, when removed data been created again
    if (this.removeCache[id] && this.removeCache[id].removedAtBlock === blockHeight) {
      delete this.removeCache[id];
    }
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

  remove(id: string, blockHeight: number): void {
    // we don't need to check whether id is already removed,
    // because it could be removed->create-> removed again,
    // the operationIndex should always be the latest operation
    this.removeCache[id] = {
      removedAtBlock: blockHeight,
      operationIndex: this.getNextStoreOperationIndex(),
    };
    this.flushableRecordCounter += 1;
    if (this.getCache.has(id)) {
      this.getCache.delete(id);
      // Also when .get, check removeCache first, should return undefined if removed
    }
    if (this.setCache[id]) {
      // close last record
      this.setCache[id].markAsRemoved(blockHeight);
    }
  }

  bulkRemove(ids: string[], blockHeight: number): void {
    ids.map((id) => this.remove(id, blockHeight));
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length || !!Object.keys(this.removeCache).length;
  }

  async runFlush(tx: Transaction, blockHeight: number): Promise<void> {
    // Get records relevant to the block height
    const {removeRecords, setRecords} = this.filterRecordsWithHeight(blockHeight);
    // Filter non-historical could return undefined due to it been removed
    let records = this.applyBlockRange(setRecords).filter((r) => !!r);
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
      // We need to check within the same model if there is multiple operations (set/remove) to the same id
      // we don't have to consider the order in setCache, as we are using getLatest()?.data;
      // also in removeCache only store last remove operation too.

      // If same Id exist in both set and remove records, we only need to pick the last operation for this ID,
      // As both cache in final status, so we can compare their operation index
      for (const v of Object.values(setRecords)) {
        const latestSet = v.getLatest();
        if (latestSet !== undefined && removeRecords[latestSet.data.id]) {
          if (removeRecords[latestSet.data.id].operationIndex > latestSet.operationIndex) {
            records = records.filter((r) => r.id !== latestSet.data.id);
          } else if (removeRecords[latestSet.data.id].operationIndex < latestSet.operationIndex) {
            delete removeRecords[latestSet.data.id];
          } else {
            throw new Error(
              `Cache entity ${this.model.name} Id ${latestSet.data.id} has same Operation Indexes in remove and set cache `
            );
          }
        }
      }

      dbOperation = Promise.all([
        records.length &&
          this.model.bulkCreate(records, {
            transaction: tx,
            updateOnDuplicate: Object.keys(records[0]) as unknown as (keyof T)[],
          }),
        Object.keys(removeRecords).length &&
          this.model.destroy({where: {id: Object.keys(removeRecords)} as any, transaction: tx}),
      ]);
    }
    this.exporters.forEach((store: Exporter) => {
      tx.afterCommit(async () => {
        await store.export(records);
      });
    });
    await dbOperation;
  }

  // Flush relation model in operationIndex order with non-historical db
  async flushOperation(operationIndex: number, tx: Transaction): Promise<void> {
    const removeRecordKey = Object.keys(this.removeCache).find(
      (key) => this.removeCache[key].operationIndex === operationIndex
    );
    if (removeRecordKey !== undefined) {
      await this.model.destroy({where: {id: removeRecordKey} as any, transaction: tx});
      delete this.removeCache[removeRecordKey];
    } else {
      let setRecord: SetValue<T> | undefined;
      for (const r of Object.values(this.setCache)) {
        setRecord = r.popRecordWithOpIndex(operationIndex);
        if (setRecord) break;
      }
      if (setRecord) {
        await this.model.upsert(setRecord.data as unknown as CreationAttributes<Model<T, T>>, {transaction: tx});
      }
      return;
    }
  }

  private filterRemoveRecordByHeight(blockHeight: number, lessEqt: boolean): Record<string, RemoveValue> {
    return Object.entries(this.removeCache).reduce(
      (acc, [key, value]) => {
        if (lessEqt ? value.removedAtBlock <= blockHeight : value.removedAtBlock > blockHeight) {
          acc[key] = value;
        }

        return acc;
      },
      {} as Record<string, RemoveValue>
    );
  }

  private filterRecordsWithHeight(blockHeight: number): FilteredHeightRecords<T> {
    return {
      removeRecords: this.filterRemoveRecordByHeight(blockHeight, true),
      setRecords: Object.entries(this.setCache).reduce((acc, [key, value]) => {
        const newValue = value.fromBelowHeight(blockHeight + 1);
        if (newValue.getValues().length) {
          acc[key] = newValue;
        }
        return acc;
      }, {} as SetData<T>),
    };
  }

  // Add blockRange to historical record
  private applyBlockRange(_setRecords: SetData<T>) {
    const setRecords = cloneDeep(_setRecords);
    return flatten(
      Object.values(setRecords).map((v) => {
        if (!this.historical) {
          return v.getLatest()?.data;
        }
        // Historical
        // Alternative: historicalValue.data.__block_range = [historicalValue.startHeight, historicalValue.endHeight];
        return v
          .getValues()
          .map((historicalValue) => {
            // prevent flush this record,
            // this is happened when set and remove in same block
            if (historicalValue.removed && historicalValue.startHeight === historicalValue.endHeight) {
              return;
            }
            historicalValue.data.__block_range = this.sequelize.fn(
              'int8range',
              historicalValue.startHeight,
              historicalValue.endHeight
            );
            return historicalValue.data;
          })
          .filter((r) => !!r);
      })
    ) as unknown as CreationAttributes<Model<T, T>>[];
  }

  clear(blockHeight?: number): void {
    if (blockHeight === undefined) {
      this.setCache = {};
      // avoid fetch old data after rewind/reindex
      this.getCache = new GetData<T>(getCacheOptions);
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
        acc[key] = newValue;
      }
      return acc;
    }, {} as SetData<T>);

    this.removeCache = this.filterRemoveRecordByHeight(blockHeight, false);

    this.flushableRecordCounter = newCounter;
  }

  // Different with markAsDeleted, we only mark/close all the records less than current block height
  // thus, and new record with current block height will not be impacted,
  // advantage is this sql is safe to concurrency resolve with any insert sql
  private async historicalMarkPreviousHeightRecordsBatch(
    tx: Transaction,
    setRecords: SetData<T>,
    removeRecords: Record<string, RemoveValue>
  ): Promise<void> {
    const closeSetRecords: {id: string; blockHeight: number}[] = [];
    for (const [id, value] of Object.entries(setRecords)) {
      const firstValue = value.getFirst();
      if (firstValue !== undefined) {
        closeSetRecords.push({id, blockHeight: firstValue.startHeight});
      }
    }
    const closeRemoveRecords = Object.entries(removeRecords).map(([id, value]) => {
      return {id, blockHeight: value.removedAtBlock};
    });
    const mergedRecords = closeSetRecords.concat(closeRemoveRecords);

    if (!mergedRecords.length) {
      return;
    }

    await this.sequelize.query(
      `UPDATE ${this.model.getTableName()} table1 SET _block_range = int8range(lower("_block_range"), table2._block_end)
            from (SELECT UNNEST(array[${mergedRecords.map((r) =>
              this.sequelize.escape(r.id)
            )}]) AS id, UNNEST(array[${mergedRecords.map((r) => r.blockHeight)}]) AS _block_end) AS table2
            WHERE table1.id = table2.id and "_block_range" @> _block_end-1::int8;`,
      {transaction: tx}
    );
  }

  private get sequelize(): Sequelize {
    const sequelize = this.model.sequelize;

    if (!sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    return sequelize;
  }
}
