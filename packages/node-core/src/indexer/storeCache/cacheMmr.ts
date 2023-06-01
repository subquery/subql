// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Db} from '@subql/x-merkle-mountain-range';
import {Mutex} from 'async-mutex';
import LRUCache from 'lru-cache';
import {Sequelize, Transaction} from 'sequelize';
import {PgBasedMMRDB} from '../entities/Mmr.entitiy';
import {ICachedModelControl} from './types';

const cacheOptions = {
  max: 100, // default value
  ttl: 1000 * 60 * 60, // in ms
  updateAgeOnGet: true, // we want to keep most used record in cache longer
};

export class CachePgMmrDb implements ICachedModelControl, Db {
  private leafLength?: number;
  flushableRecordCounter = 0;
  private cacheData = new LRUCache<number, Uint8Array>(cacheOptions);
  private setData: Record<number, Uint8Array> = {};
  private leafLengthChanged = false;
  private mutex = new Mutex();


  constructor(private db: PgBasedMMRDB) {}

  get isFlushable(): boolean {
    return !!Object.keys(this.setData).length || this.leafLengthChanged;
  }

  async flush(tx: Transaction, blockHeight?: number | undefined): Promise<void> {
    if (this.isFlushable) {
      const release = await this.mutex.acquire();
      tx.afterCommit(() => {
        release();
      });
      const data = {...this.setData};
      this.setData = {};
      await this.db.bulkSet(data, tx);
      if (this.leafLength) {
        this.leafLengthChanged = false;
        await this.db.setLeafLength(this.leafLength, tx);
      }
    }
  }

  static async create(sequelize: Sequelize, schema: string): Promise<CachePgMmrDb> {
    const db = await PgBasedMMRDB.create(sequelize, schema);

    return new CachePgMmrDb(db);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async set(value: Uint8Array, key: number): Promise<void> {
    this.cacheData.set(key, value);
    this.setData[key] = value;
    this.flushableRecordCounter++;
  }

  async get(key: number): Promise<Uint8Array | null> {
    await this.mutex.waitForUnlock();
    const result = this.cacheData.get(key);
    if (result) return result;
    if (this.setData[key]) return this.setData[key];

    const dbResult = await this.db.get(key);
    if (dbResult) {
      this.cacheData.set(key, dbResult);
    }
    return dbResult;
  }

  // Not sure when this gets used
  async delete(key: number): Promise<void> {
    await this.mutex.waitForUnlock();
    await this.db.delete(key);
    this.cacheData.delete(key);
    delete this.setData[key];
  }

  async getLeafLength(): Promise<number> {
    await this.mutex.waitForUnlock();
    if (this.leafLength === undefined) {
      this.leafLength = await this.db.getLeafLength();
    }
    return this.leafLength;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async setLeafLength(length: number): Promise<number> {
    this.leafLength = length;
    this.leafLengthChanged = true;
    return length;
  }

  async getNodes(): Promise<Record<number, Uint8Array>> {
    await this.mutex.waitForUnlock();
    return {...(await this.db.getNodes()), ...this.setData};
  }
}
