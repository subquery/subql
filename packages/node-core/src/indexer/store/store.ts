// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Store as IStore, Entity, FieldsExpression} from '@subql/types-core';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {StoreCacheService} from '../storeCache';
import {StoreOperations} from '../StoreOperations';
import {OperationType} from '../types';
import {EntityClass} from './entity';

const logger = getLogger('Store');

export class Store implements IStore {
  constructor(
    private config: NodeConfig,
    private storeCache: StoreCacheService,
    private blockHeight: number,
    private isIndexed: (entity: string, field: string) => boolean,
    private isIndexedHistorical: (entity: string, field: string) => boolean,
    private operationStack?: StoreOperations
  ) {}

  async get<T extends Entity>(entity: string, id: string): Promise<T | undefined> {
    try {
      const raw = await this.storeCache.getModel<T>(entity).get(id);
      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to get Entity ${entity} with id ${id}: ${e}`);
    }
  }

  async getByField<T extends Entity>(
    entity: string,
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: {
      offset?: number;
      limit?: number;
    } = {}
  ): Promise<T[]> {
    try {
      const indexed = this.isIndexed(entity, String(field));
      assert(indexed, `to query by field ${String(field)}, an index must be created on model ${entity}`);
      if (options?.limit && this.config.queryLimit < options?.limit) {
        logger.warn(
          `store getByField for entity ${entity} with ${options.limit} records exceeds config limit ${this.config.queryLimit}. Will use ${this.config.queryLimit} as the limit.`
        );
      }
      const finalLimit = options.limit ? Math.min(options.limit, this.config.queryLimit) : this.config.queryLimit;
      if (options.offset === undefined) {
        options.offset = 0;
      }
      const raw = await this.storeCache
        .getModel<T>(entity)
        .getByField(field, value, {limit: finalLimit, offset: options.offset});

      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }

  async getByFields<T extends Entity>(
    entity: string,
    filter: FieldsExpression<T>[],
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<T[]> {
    try {
      // Check that the fields are indexed
      filter.forEach((f) => {
        assert(
          this.isIndexed(entity, String(f[0])),
          `to query by field ${String(f[0])}, an index must be created on model ${entity}`
        );
      });

      if (options?.limit && this.config.queryLimit < options?.limit) {
        logger.warn(
          `store getByField for entity ${entity} with ${options.limit} records exceeds config limit ${this.config.queryLimit}. Will use ${this.config.queryLimit} as the limit.`
        );
      }

      const finalOptions = {
        offset: options?.offset ?? 0,
        limit: Math.min(options?.limit ?? this.config.queryLimit, this.config.queryLimit),
      };

      const raw = await this.storeCache.getModel<T>(entity).getByFields(filter, finalOptions);

      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByFields Entity ${entity}: ${e}`);
    }
  }

  async getOneByField<T extends Entity>(
    entity: string,
    field: keyof T,
    value: T[keyof T]
    // eslint-disable-next-line @typescript-eslint/require-await
  ): Promise<T | undefined> {
    try {
      const indexed = this.isIndexedHistorical(entity, field as string);
      assert(indexed, `to query by field ${String(field)}, a unique index must be created on model ${entity}`);
      const raw = await this.storeCache.getModel<T>(entity).getOneByField(field, value);

      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to getOneByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async set(entity: string, _id: string, data: Entity): Promise<void> {
    try {
      this.storeCache.getModel(entity).set(_id, data, this.blockHeight);

      this.operationStack?.put(OperationType.Set, entity, data);
    } catch (e) {
      throw new Error(`Failed to set Entity ${entity} with _id ${_id}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkCreate(entity: string, data: Entity[]): Promise<void> {
    try {
      this.storeCache.getModel(entity).bulkCreate(data, this.blockHeight);

      for (const item of data) {
        this.operationStack?.put(OperationType.Set, entity, item);
      }
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void> {
    try {
      this.storeCache.getModel(entity).bulkUpdate(data, this.blockHeight, fields);
      for (const item of data) {
        this.operationStack?.put(OperationType.Set, entity, item);
      }
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async remove(entity: string, id: string): Promise<void> {
    try {
      this.storeCache.getModel(entity).remove(id, this.blockHeight);

      this.operationStack?.put(OperationType.Remove, entity, id);
    } catch (e) {
      throw new Error(`Failed to remove Entity ${entity} with id ${id}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkRemove(entity: string, ids: string[]): Promise<void> {
    try {
      this.storeCache.getModel(entity).bulkRemove(ids, this.blockHeight);

      for (const id of ids) {
        this.operationStack?.put(OperationType.Remove, entity, id);
      }
    } catch (e) {
      throw new Error(`Failed to bulkRemove Entity ${entity}: ${e}`);
    }
  }
}
