// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Db} from '@subql/x-merkle-mountain-range';
import LRUCache from 'lru-cache';
import {Sequelize} from 'sequelize';
import {PgBasedMMRDB} from '../entities/Mmr.entitiy';

const cacheOptions = {
  max: 100, // default value
  ttl: 1000 * 60 * 60, // in ms
  updateAgeOnGet: true, // we want to keep most used record in cache longer
};

export class CachePgMmrDb implements Db {
  private leafLength?: number;

  private cacheData = new LRUCache<number, Uint8Array>(cacheOptions);
  private setData: Record<number, Uint8Array> = {};

  constructor(
    private db: PgBasedMMRDB,
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    public readonly setThreshold = 10
  ) {}

  static async create(sequelize: Sequelize, schema: string): Promise<CachePgMmrDb> {
    const db = await PgBasedMMRDB.create(sequelize, schema);

    return new CachePgMmrDb(db);
  }

  async set(value: Uint8Array, key: number): Promise<void> {
    this.cacheData.set(key, value);
    this.setData[key] = value;

    if (Object.keys(this.setData).length >= this.setThreshold) {
      const data = {...this.setData};
      this.setData = {};
      await this.db.bulkSet(data);
    }
  }

  async get(key: number): Promise<Uint8Array | null> {
    const result = this.cacheData.get(key);

    if (result) return result;

    const dbResult = await this.db.get(key);
    if (dbResult) {
      this.cacheData.set(key, dbResult);
    }
    return dbResult;
  }

  async delete(key: number): Promise<void> {
    await this.db.delete(key);
    this.cacheData.delete(key);
    delete this.setData[key];
  }

  async getLeafLength(): Promise<number> {
    if (this.leafLength === undefined) {
      this.leafLength = await this.db.getLeafLength();
    }
    return this.leafLength;
  }

  async setLeafLength(length: number): Promise<number> {
    this.leafLength = length;

    await this.db.setLeafLength(length);
    return length;
  }

  async getNodes(): Promise<Record<number, Uint8Array>> {
    return {...(await this.db.getNodes()), ...this.setData};
  }
}
