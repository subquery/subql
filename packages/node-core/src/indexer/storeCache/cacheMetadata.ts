// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Transaction} from '@subql/x-sequelize';
import {getLogger} from '../..//logger';
import {hasValue} from '../../utils';
import {Metadata, MetadataKeys, MetadataRepo} from '../entities';
import {Cacheable} from './cacheable';
import {ICachedModelControl} from './types';

type MetadataKey = keyof MetadataKeys;
const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];

export class CacheMetadataModel extends Cacheable implements ICachedModelControl {
  private setCache: Partial<MetadataKeys> = {};
  // Needed for dynamic datasources
  private getCache: Partial<MetadataKeys> = {};
  private removeCache: string[] = [];

  flushableRecordCounter = 0;

  constructor(readonly model: MetadataRepo) {
    super();
  }

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

  async runFlush(tx: Transaction, blockHeight?: number): Promise<void> {
    const ops = Object.entries(this.setCache)
      .filter(([key]) => !incrementKeys.includes(key as MetadataKey))
      .map(([key, value]) => ({key, value} as Metadata));
    const lastProcessedHeightIdx = ops.findIndex((k) => k.key === 'lastProcessedHeight');
    if (blockHeight !== undefined && lastProcessedHeightIdx >= 0) {
      const lastProcessedHeight = Number(ops[lastProcessedHeightIdx].value);
      // Before flush, lastProcessedHeight was obtained from metadata
      // During the flush, we are expecting metadata not being updated. Therefore, we exit here to ensure data accuracy and integrity.
      // This is unlikely happened. However, we need to observe how often this occurs, we need to adjust this logic if frequently.
      // Also, we can remove `lastCreatedPoiHeight` from metadata, as it will recreate again with indexing .
      assert(blockHeight === lastProcessedHeight, 'metadata was updated before getting flushed');
    }
    await Promise.all([
      this.model.bulkCreate(ops, {
        transaction: tx,
        updateOnDuplicate: ['key', 'value'],
      }),
      ...incrementKeys
        .map((key) => this.setCache[key] && this.incrementJsonbCount(key, this.setCache[key] as number, tx))
        .filter(Boolean),
      this.model.destroy({where: {key: this.removeCache}}),
    ]);
  }

  // This is current only use for migrate Poi
  // If concurrent change to cache, please add mutex if needed
  bulkRemove<K extends MetadataKey>(keys: K[]): void {
    this.removeCache.push(...keys);
    for (const key of keys) {
      delete this.setCache[key];
      delete this.getCache[key];
    }
  }

  clear(blockHeight?: number): void {
    const newSetCache: Partial<MetadataKeys> = {};
    this.flushableRecordCounter = 0;
    if (blockHeight !== undefined && blockHeight !== this.setCache.lastProcessedHeight) {
      newSetCache.lastProcessedHeight = this.setCache.lastProcessedHeight;
      this.flushableRecordCounter = 1;
    }
    this.setCache = {...newSetCache};
    this.getCache = {...newSetCache};
  }
}
