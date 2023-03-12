// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {flatten} from 'lodash';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from 'sequelize';
import {Fn} from 'sequelize/types/utils';
import {NodeConfig} from '../configure';

const FLUSH_FREQUENCY = 5;

type SetData<T> = Record<string, SetValueModel<T>>;
export type EntitySetData = Record<string, SetData<any>>;

interface ICachedModel<T> {
  get: (id: string, tx: Transaction) => Promise<T | null>;
  set: (id: string, data: T, blockHeight: number) => void;

  // TODO implement other Store interface methods: count, getByField, getOneByField, bulkCreate, bulkUpdate, remove
}

interface ICachedModelControl<T> {
  isFlushable: boolean;

  sync(data: SetData<T>): void;
  flush(tx: Transaction): Promise<void>;
  dumpSetData(): SetData<T>;
  clear(): void;
}

type GetValue<T> = {
  // Null value indicates its not defined in the db
  data: T | null;
  // Future-proof to allow meta for clearing cache
};

type SetValue<T> = {
  data: T;
  startHeight: number;
  endHeight: number | null;
};

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
}

class CachedModel<
  T extends {id: string; __block_range?: (number | null)[] | Fn} = {id: string; __block_range?: (number | null)[] | Fn}
> implements ICachedModel<T>, ICachedModelControl<T>
{
  // Null value indicates its not defined in the db
  private getCache: Record<string, GetValue<T>> = {};

  // TODO support key by historical
  private setCache: SetData<T> = {};

  constructor(readonly model: ModelStatic<Model<T, T>>, private readonly historical = true) {}

  private get historicalModel(): ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>> {
    return this.model as ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>>;
  }

  async get(id: string, tx: Transaction): Promise<T | null> {
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

  set(id: string, data: T, blockHeight: number): void {
    if (this.setCache[id] === undefined) {
      this.setCache[id] = new SetValueModel();
    }
    this.setCache[id].set(data, blockHeight);
    this.getCache[id] = {data};
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length;
  }

  async flush(tx: Transaction): Promise<void> {
    const records = flatten(
      Object.values(this.setCache).map((v) => {
        return v.getValues().map((historicalValue) => {
          if (this.historical) {
            // Alternative: historicalValue.data.__block_range = [historicalValue.startHeight, historicalValue.endHeight];
            historicalValue.data.__block_range = this.model.sequelize.fn(
              'int8range',
              historicalValue.startHeight,
              historicalValue.endHeight
            );
          }
          return historicalValue.data;
        });
      })
    ) as unknown as CreationAttributes<Model<T, T>>[];

    if (this.historical) {
      // TODO update records __block_range
      await Promise.all([
        // mark to close previous records within blockHeight -1, within all entity IDs
        this.markPreviousHeightRecordsBatch(tx),
        // bulkCreate all new records for this entity
        this.model.bulkCreate(records, {
          transaction: tx,
        }),
      ]);
    } else {
      await this.model.bulkCreate(records, {
        transaction: tx,
        updateOnDuplicate: Object.keys(records[0]) as unknown as (keyof T)[], // TODO is this right? we want upsert behaviour
      });
    }

    this.setCache = {};
  }

  clear(): void {
    this.getCache = {};
    this.setCache = {};
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

  private async markPreviousHeightRecordsBatch(tx: Transaction): Promise<any[]> {
    // Different with markAsDeleted, we only mark/close all the records less than current block height
    // thus, and new record with current block height will not be impacted,
    // advantage is this sql is safe to concurrency resolve with any insert sql
    return Promise.all(
      Object.entries(this.setCache).map(([id, value]) => {
        const firstCachedValue = value.getFirst();
        if (!firstCachedValue) {
          return;
        }
        this.historicalModel.update(
          {
            __block_range: this.model.sequelize.fn(
              'int8range',
              this.model.sequelize.fn('lower', this.model.sequelize.col('_block_range')),
              firstCachedValue.startHeight
            ),
          },
          {
            hooks: false,
            transaction: tx,
            // https://github.com/sequelize/sequelize/issues/15179
            where: {
              id,
              __block_range: {
                [Op.contains]: (firstCachedValue.startHeight - 1) as any,
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
