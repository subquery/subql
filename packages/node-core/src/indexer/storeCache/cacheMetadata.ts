// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Transaction} from '@subql/x-sequelize';
import {hasValue} from '../../utils';
import {Metadata, MetadataKeys, MetadataRepo} from '../entities';
import {ICachedModelControl} from './types';

type MetadataKey = keyof MetadataKeys;
const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];

export class CacheMetadataModel implements ICachedModelControl {
  private setCache: Partial<MetadataKeys> = {};
  // Needed for dynamic datasources
  private getCache: Partial<MetadataKeys> = {};

  flushableRecordCounter = 0;

  constructor(readonly model: MetadataRepo) {}

  async find<K extends MetadataKey>(key: K, fallback?: MetadataKeys[K]): Promise<MetadataKeys[K] | undefined> {
    if (!this.getCache[key]) {
      const record = await this.model.findByPk(key);

      if (hasValue(record)) {
        this.getCache[key] = record.toJSON().value as any;
      } else if (hasValue(fallback)) {
        this.getCache[key] = fallback;
      }
    }

    return this.getCache[key] as MetadataKeys[K] | undefined;
  }

  async findMany<K extends MetadataKey>(keys: readonly K[]): Promise<Partial<MetadataKeys>> {
    const entries = await this.model.findAll({
      where: {
        key: keys,
      },
    });

    const keyValue = entries.reduce((arr, curr) => {
      arr[curr.key as K] = curr.value as MetadataKeys[K];
      return arr;
    }, {} as Partial<MetadataKeys>);

    // Get any unsaved changes
    const result = {
      ...keyValue,
      ...this.setCache,
    };

    // Update cache
    this.getCache = {
      ...this.getCache,
      ...result,
    };

    return result;
  }

  set<K extends MetadataKey>(key: K, value: MetadataKeys[K]): void {
    if (this.setCache[key] === undefined) {
      this.flushableRecordCounter += 1;
    }
    this.setCache[key] = value;
    this.getCache[key] = value;
  }

  setBulk(metadata: Metadata[]): void {
    metadata.map((m) => this.set(m.key, m.value));
  }

  setIncrement(key: 'processedBlockCount' | 'schemaMigrationCount', amount = 1): void {
    this.setCache[key] = (this.setCache[key] ?? 0) + amount;
  }

  private async incrementJsonbCount(key: string, amount = 1, tx?: Transaction): Promise<void> {
    const table = this.model.getTableName();

    if (!this.model.sequelize) {
      throw new Error(`Sequelize is not available on ${this.model.name}`);
    }

    await this.model.sequelize.query(
      `UPDATE ${table} SET value = (COALESCE(value->0):: int + ${amount})::text::jsonb WHERE key ='${key}'`,
      tx && {transaction: tx}
    );
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length;
  }

  async flush(tx: Transaction): Promise<void> {
    const ops = Object.entries(this.setCache)
      .filter(([key]) => !incrementKeys.includes(key as MetadataKey))
      .map(([key, value]) => ({key, value} as Metadata));

    const pendingFlush = Promise.all([
      this.model.bulkCreate(ops, {
        transaction: tx,
        updateOnDuplicate: ['key', 'value'],
      }),
      ...incrementKeys
        .map((key) => this.setCache[key] && this.incrementJsonbCount(key, this.setCache[key] as number, tx))
        .filter(Boolean),
    ]);

    // Don't await DB operations to complete before clearing.
    // This allows new data to be cached while flushing
    this.clear();

    await pendingFlush;
  }

  private clear(): void {
    this.setCache = {};
    this.flushableRecordCounter = 0;
  }
}
