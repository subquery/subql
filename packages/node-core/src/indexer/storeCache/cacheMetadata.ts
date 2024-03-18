// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Transaction} from '@subql/x-sequelize';
import {hasValue} from '../../utils';
import {DatasourceParams} from '../dynamic-ds.service';
import {Metadata, MetadataKeys, MetadataRepo} from '../entities';
import {Cacheable} from './cacheable';
import {ICachedModelControl} from './types';

type MetadataKey = keyof MetadataKeys;
const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];
type IncrementalMetadataKey = 'processedBlockCount' | 'schemaMigrationCount';

const specialKeys: MetadataKey[] = [...incrementKeys, 'dynamicDatasources'];

export class CacheMetadataModel extends Cacheable implements ICachedModelControl {
  private setCache: Partial<MetadataKeys> = {};
  // Needed for dynamic datasources
  private getCache: Partial<MetadataKeys> = {};
  private removeCache: string[] = [];

  // This is used for a more efficient appending, as opposed to rewriting which is used through setCache
  private datasourceUpdates: DatasourceParams[] = [];

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

    if (key === 'dynamicDatasources') {
      // Include any unflushed datasource updates in this
      return [
        ...(this.getCache[key] as MetadataKeys['dynamicDatasources']),
        ...this.datasourceUpdates,
      ] as MetadataKeys[K];
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
    if (key === 'dynamicDatasources') {
      this.datasourceUpdates = [];
    }
  }

  setBulk(metadata: Metadata[]): void {
    metadata.map((m) => this.set(m.key, m.value));
  }

  setIncrement(key: IncrementalMetadataKey, amount = 1): void {
    this.setCache[key] = (this.setCache[key] ?? 0) + amount;
  }

  setNewDynamicDatasource(item: DatasourceParams): void {
    this.datasourceUpdates.push(item);
  }

  private async incrementJsonbCount(key: IncrementalMetadataKey, amount = 1, tx?: Transaction): Promise<void> {
    const schemaTable = this.model.getTableName();

    assert(this.model.sequelize, `Sequelize is not available on ${this.model.name}`);

    await this.model.sequelize.query(
      `
          INSERT INTO ${schemaTable} (key, value, "createdAt", "updatedAt")
          VALUES ('${key}', '0'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (key) DO
          UPDATE SET value = (COALESCE(${schemaTable}.value->>0)::int + '${amount}')::text::jsonb,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE ${schemaTable}.key = '${key}';`,
      tx && {transaction: tx}
    );
  }

  private async appendDynamicDatasources(items: DatasourceParams[], tx?: Transaction): Promise<void> {
    const schemaTable = this.model.getTableName();

    assert(this.model.sequelize, `Sequelize is not available on ${this.model.name}`);

    const VALUE = '"value"';

    const makeSet = (item: DatasourceParams, value: string, index = 1): string =>
      `jsonb_set(${value}, array[(jsonb_array_length(${VALUE}) + ${index})::text], '${JSON.stringify(
        item
      )}'::jsonb, true)`;

    await this.model.sequelize.query(
      `
      UPDATE ${schemaTable}
      SET ${VALUE} = ${items.reduce((acc, item, index) => makeSet(item, acc, index + 1), VALUE)},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE ${schemaTable}.key = 'dynamicDatasources';
    `,
      tx && {transaction: tx}
    );
  }

  private async handleSpecialKeys(tx?: Transaction): Promise<void> {
    await Promise.all(
      specialKeys.map(async (key) => {
        switch (key) {
          case 'dynamicDatasources': {
            /**
             * DynamicDatasources can be rewriten through set, or appended through setNewDynamicDatasource.
             * rewriting takes priority over appending
             * rewritten is used when rewinds happen
             **/
            const val = this.setCache[key];
            if (val !== undefined) {
              await this.model.bulkCreate([{key, value: val}], {transaction: tx, updateOnDuplicate: ['key', 'value']});
            } else if (this.datasourceUpdates.length) {
              await this.appendDynamicDatasources(this.datasourceUpdates, tx);
            }
            break;
          }
          case 'processedBlockCount':
          case 'schemaMigrationCount': {
            const val = this.setCache[key];
            if (val === undefined) break;
            await this.incrementJsonbCount(key as IncrementalMetadataKey, this.setCache[key] as number, tx);
            break;
          }
          default:
            throw new Error(`No special case for ${key}`);
        }
      })
    );
  }

  get isFlushable(): boolean {
    return !!Object.keys(this.setCache).length;
  }

  async runFlush(tx: Transaction, blockHeight?: number): Promise<void> {
    const ops = Object.entries(this.setCache)
      .filter(([key]) => !specialKeys.includes(key as MetadataKey))
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
      this.handleSpecialKeys(tx),
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
    if (
      blockHeight !== undefined &&
      this.setCache.lastProcessedHeight !== undefined &&
      blockHeight !== this.setCache.lastProcessedHeight
    ) {
      newSetCache.lastProcessedHeight = this.setCache.lastProcessedHeight;
      this.flushableRecordCounter = 1;
    }
    this.setCache = {...newSetCache};
    this.getCache = {...newSetCache};
    this.datasourceUpdates = [];
  }
}
