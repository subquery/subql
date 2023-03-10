// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {Injectable} from '@nestjs/common';
import {CreationAttributes, Model, ModelStatic, Op, Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../configure';
import { Entity } from '@subql/types';

const FLUSH_FREQUENCY = 1;

type SetData<T> = Record<string, SetValue<T>>;
export type EntitySetData = Record<string, SetData<any>>;

interface ICachedModel<T>{
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
}

type SetValue<T> = {
  data: T;
  blockHeight: number;
}

type HistoricalModel = { __block_range: any; };


class CachedModel<T extends {  id: string; } = { id: string; }> implements ICachedModel<T>, ICachedModelControl<T> {

  // Null value indicates its not defined in the db
  private getCache: Record<string, GetValue<T>> = {};

  // TODO support key by historical
  private setCache: SetData<T> = {};

  constructor(
    readonly model: ModelStatic<Model<T, T>>,
    private readonly historical = true
  ) {

  }

  private get historicalModel(): ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>> {
    return this.model as ModelStatic<Model<T & HistoricalModel, T & HistoricalModel>>;
  }

  async get(id: string, tx: Transaction): Promise<T | null> {
    if (this.getCache[id] === undefined) {
      const record = await this.model.findOne({
        // https://github.com/sequelize/sequelize/issues/15179
        where: { id } as any,
        transaction: tx,
      });

      this.getCache[id] = {
        data: record.toJSON<T>()
      };
    }

    return this.getCache[id].data;
  }

  set(id: string, data: T, blockHeight: number): void {

    this.setCache[id] = { data, blockHeight };
    this.getCache[id] = { data };
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length
  }

  async flush(tx: Transaction): Promise<void> {

    const records = Object.values(this.setCache).map(v => v.data) as unknown as CreationAttributes<Model<T, T>>[];

    if (this.historical) {
      // TODO update records __block_range

      await Promise.all([
        // mark to close previous records within blockheight -1, within all entity IDs
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

    Object.entries(data)
      .map(([id, enttity]) => {
        // TODO update for historical
        this.setCache[id] = enttity;
      })
  }

  private async markPreviousHeightRecordsBatch(tx: Transaction): Promise<any[]> {
    // Different with markAsDeleted, we only mark/close all the records less than current block height
    // thus, and new record with current block height will not be impacted,
    // advantage is this sql is safe to concurrency resolve with any insert sql

    return Promise.all(Object.entries(this.setCache).map(([id, value]) =>
      this.historicalModel.update(
      {
        __block_range: this.model.sequelize.fn(
          'int8range',
          this.model.sequelize.fn('lower', this.model.sequelize.col('_block_range')),
          value.blockHeight
        ),
      },
      {
        hooks: false,
        transaction: tx,
        // https://github.com/sequelize/sequelize/issues/15179
        where: {
          id,
          __block_range: {
            [Op.contains]: (value.blockHeight - 1) as any,
          },
        } as any,
      }
    )));
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

    Object.entries(this.cachedModels)
      .map(([entity, model]) => {
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
    const updatableModels = Object.values(this.cachedModels)
      .filter(m => m.isFlushable);

    await Promise.all(updatableModels.map(model => model.flush(this.tx)));
  }

  async flushCache(): Promise<void> {
    if (this.isFlushable()) {
      await this._flushCache();
      // Note flushCache and commit transaction need to sequential
      await this.commitTransaction();
      this.resetMemoryStore();
    }
  }

  syncData(data: EntitySetData): void {
    Object.entries(data)
      .map(([entity, setData]) => {
        (this.getModel(entity) as CachedModel)
          .sync(setData);
      })
  }

  isFlushable(): boolean {
    return this.flushCounter % FLUSH_FREQUENCY === 0;
  }

  resetMemoryStore(): void {
    Object.values(this.cachedModels)
      .map(model => model.clear());
  }
}
