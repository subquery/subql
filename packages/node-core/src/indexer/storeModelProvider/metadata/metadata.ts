// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Op, Transaction} from '@subql/x-sequelize';
import {hasValue} from '../../../utils';
import {DatasourceParams} from '../../dynamic-ds.service';
import {Metadata, MetadataKeys, MetadataRepo} from '../../entities';
import {APPEND_DS_QUERY, INCREMENT_QUERY} from './utils';

export type MetadataKey = keyof MetadataKeys;
export const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];
export type IncrementalMetadataKey = 'processedBlockCount' | 'schemaMigrationCount';

export interface IMetadata {
  readonly model: MetadataRepo;
  find<K extends MetadataKey>(key: K, fallback?: MetadataKeys[K]): Promise<MetadataKeys[K] | undefined>;
  findMany<K extends MetadataKey>(keys: readonly K[]): Promise<Partial<MetadataKeys>>;

  set<K extends MetadataKey>(key: K, value: MetadataKeys[K], tx?: Transaction): Promise<void>;
  setBulk(metadata: Metadata[], tx?: Transaction): Promise<void>;
  setIncrement(key: IncrementalMetadataKey, amount?: number, tx?: Transaction): Promise<void>;
  setNewDynamicDatasource(item: DatasourceParams, tx?: Transaction): Promise<void>;

  bulkRemove<K extends MetadataKey>(keys: K[], tx?: Transaction): Promise<void>;

  flush?(tx: Transaction, blockHeight: number): Promise<void>;
}

export class MetadataModel implements IMetadata {
  constructor(readonly model: MetadataRepo) {}

  async find<K extends MetadataKey>(key: K, fallback?: MetadataKeys[K]): Promise<MetadataKeys[K] | undefined> {
    const record = await this.model.findByPk(key);

    return hasValue(record) ? (record.toJSON().value as MetadataKeys[K]) : fallback;
  }

  async findMany<K extends MetadataKey>(keys: readonly K[]): Promise<Partial<MetadataKeys>> {
    const entries = await this.model.findAll({
      where: {
        key: keys,
      },
    });

    return entries.reduce((arr, curr) => {
      arr[curr.key as K] = curr.value as MetadataKeys[K];
      return arr;
    }, {} as Partial<MetadataKeys>);
  }

  async set<K extends MetadataKey>(key: K, value: MetadataKeys[K], tx?: Transaction): Promise<void> {
    return this.setBulk([{key, value}], tx);
  }

  async setBulk(metadata: Metadata[], tx?: Transaction): Promise<void> {
    await this.model.bulkCreate(metadata, {transaction: tx, updateOnDuplicate: ['key', 'value']});
  }

  async setIncrement(key: IncrementalMetadataKey, amount = 1, tx?: Transaction): Promise<void> {
    const schemaTable = this.model.getTableName();

    assert(this.model.sequelize, `Sequelize is not available on ${this.model.name}`);
    assert(incrementKeys.includes(key), `Key ${key} is not incrementable`);

    await this.model.sequelize.query(INCREMENT_QUERY(schemaTable, key, amount), tx && {transaction: tx});
  }

  async setNewDynamicDatasource(item: DatasourceParams, tx?: Transaction): Promise<void> {
    const schemaTable = this.model.getTableName();

    assert(this.model.sequelize, `Sequelize is not available on ${this.model.name}`);

    await this.model.sequelize.query(APPEND_DS_QUERY(schemaTable, [item]), tx && {transaction: tx});
  }

  async bulkRemove<K extends MetadataKey>(keys: K[], tx: Transaction): Promise<void> {
    await this.model.destroy({
      where: {key: {[Op.in]: keys}},
      transaction: tx,
    });
  }
}
