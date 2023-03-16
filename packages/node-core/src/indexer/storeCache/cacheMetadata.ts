// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Transaction} from 'sequelize';
import {Metadata, MetadataKeys, MetadataRepo} from '../entities';
import {ICachedModelControl, SetData} from './types';

type MetadataKey = keyof MetadataKeys;
const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];
const unfinalizedKeys: MetadataKey[] = ['unfinalizedBlocks', 'lastFinalizedVerifiedHeight'];

function guardBlockedKeys(key: MetadataKey): void {
  if (unfinalizedKeys.includes(key)) {
    throw new Error(`Key ${key} is not allowed to be cached metadata`);
  }
}

export class CacheMetadataModel implements ICachedModelControl<any> {
  private setCache: Partial<MetadataKeys> = {};
  // Needed for dynamic datasources
  private getCache: Partial<MetadataKeys> = {};

  constructor(readonly model: MetadataRepo) {}

  async find<K extends MetadataKey>(key: K): Promise<MetadataKeys[K] | undefined> {
    guardBlockedKeys(key);
    if (!this.getCache[key]) {
      const record = await this.model.findByPk(key);

      if (record?.value) {
        this.getCache[key] = record.value as any;
      }
    }

    return this.getCache[key] as MetadataKeys[K] | undefined;
  }

  set<K extends MetadataKey>(key: K, value: MetadataKeys[K]): void {
    guardBlockedKeys(key);
    this.setCache[key] = value;
    this.getCache[key] = value;
  }

  setBulk(metadata: Metadata[]): void {
    metadata.map((m) => this.set(m.key, m.value));
  }

  setIncrement(key: 'processedBlockCount' | 'schemaMigrationCount', amount = 1): void {
    guardBlockedKeys(key);
    this.setCache[key] = (this.setCache[key] ?? 0) + amount;
  }

  private async incrementJsonbCount(key: string, amount = 1, tx?: Transaction): Promise<void> {
    const table = this.model.getTableName();

    await this.model.sequelize.query(
      `UPDATE ${table} SET value = (COALESCE(value->0):: int + ${amount})::text::jsonb WHERE key ='${key}'`,
      tx && {transaction: tx}
    );
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length;
  }

  sync(data: SetData<any>): void {
    throw new Error('Method not implemented.');
  }

  async flush(tx: Transaction): Promise<void> {
    const ops = Object.entries(this.setCache)
      .filter(([key]) => !incrementKeys.includes(key as MetadataKey))
      .map(([key, value]) => ({key, value} as Metadata));

    await Promise.all([
      this.model.bulkCreate(ops, {
        transaction: tx,
        updateOnDuplicate: ['key', 'value'],
      }),
      ...incrementKeys
        .map((key) => this.setCache[key] && this.incrementJsonbCount(key, this.setCache[key] as number, tx))
        .filter(Boolean),
    ]);

    this.clear();
  }

  dumpSetData(): SetData<any> {
    throw new Error('Method not implemented.');
  }

  clear(): void {
    this.setCache = {};
  }
}
