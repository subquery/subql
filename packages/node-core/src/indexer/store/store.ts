// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

type Options = {
  offset?: number;
  limit?: number;
};

/* A context is provided to allow it to be updated by the owner of the class instance */
type Context = {
  blockHeight: number;
  operationStack?: StoreOperations;
  isIndexed: (entity: string, field: string) => boolean;
  isIndexedHistorical: (entity: string, field: string) => boolean;
};

export class Store implements IStore {
  /* These need to explicily be private using JS style private properties in order to not leak these in the sandbox */
  #config: NodeConfig;
  #storeCache: StoreCacheService;
  #context: Context;

  constructor(config: NodeConfig, storeCache: StoreCacheService, context: Context) {
    this.#config = config;
    this.#storeCache = storeCache;
    this.#context = context;
  }

  #queryLimitCheck(storeMethod: string, entity: string, options?: Options) {
    if (options?.limit && this.#config.queryLimit < options?.limit) {
      logger.warn(
        `store ${storeMethod} for entity ${entity} with ${options.limit} records exceeds config limit ${
          this.#config.queryLimit
        }. Will use ${this.#config.queryLimit} as the limit.`
      );
    }
  }

  async get<T extends Entity>(entity: string, id: string): Promise<T | undefined> {
    try {
      const raw = await this.#storeCache.getModel<T>(entity).get(id);
      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to get Entity ${entity} with id ${id}: ${e}`);
    }
  }

  async getByField<T extends Entity>(
    entity: string,
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: Options = {}
  ): Promise<T[]> {
    try {
      const indexed = this.#context.isIndexed(entity, String(field));
      assert(indexed, `to query by field ${String(field)}, an index must be created on model ${entity}`);
      this.#queryLimitCheck('getByField', entity, options);

      const finalLimit = options.limit ? Math.min(options.limit, this.#config.queryLimit) : this.#config.queryLimit;
      if (options.offset === undefined) {
        options.offset = 0;
      }
      const raw = await this.#storeCache
        .getModel<T>(entity)
        .getByField(field, value, {limit: finalLimit, offset: options.offset});

      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }

  async getByFields<T extends Entity>(entity: string, filter: FieldsExpression<T>[], options?: Options): Promise<T[]> {
    try {
      // Check that the fields are indexed
      filter.forEach((f) => {
        assert(
          this.#context.isIndexed(entity, String(f[0])),
          `to query by field ${String(f[0])}, an index must be created on model ${entity}`
        );
      });

      this.#queryLimitCheck('getByFields', entity, options);

      const finalOptions = {
        offset: options?.offset ?? 0,
        limit: Math.min(options?.limit ?? this.#config.queryLimit, this.#config.queryLimit),
      };

      const raw = await this.#storeCache.getModel<T>(entity).getByFields(filter, finalOptions);

      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByFields Entity ${entity}: ${e}`);
    }
  }

  async getOneByField<T extends Entity>(entity: string, field: keyof T, value: T[keyof T]): Promise<T | undefined> {
    try {
      const indexed = this.#context.isIndexedHistorical(entity, field as string);
      assert(indexed, `to query by field ${String(field)}, a unique index must be created on model ${entity}`);
      const raw = await this.#storeCache.getModel<T>(entity).getOneByField(field, value);

      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to getOneByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async set(entity: string, _id: string, data: Entity): Promise<void> {
    try {
      this.#storeCache.getModel(entity).set(_id, data, this.#context.blockHeight);

      this.#context.operationStack?.put(OperationType.Set, entity, data);
    } catch (e) {
      throw new Error(`Failed to set Entity ${entity} with _id ${_id}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkCreate(entity: string, data: Entity[]): Promise<void> {
    try {
      this.#storeCache.getModel(entity).bulkCreate(data, this.#context.blockHeight);

      for (const item of data) {
        this.#context.operationStack?.put(OperationType.Set, entity, item);
      }
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void> {
    try {
      this.#storeCache.getModel(entity).bulkUpdate(data, this.#context.blockHeight, fields);
      for (const item of data) {
        this.#context.operationStack?.put(OperationType.Set, entity, item);
      }
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async remove(entity: string, id: string): Promise<void> {
    try {
      this.#storeCache.getModel(entity).remove(id, this.#context.blockHeight);

      this.#context.operationStack?.put(OperationType.Remove, entity, id);
    } catch (e) {
      throw new Error(`Failed to remove Entity ${entity} with id ${id}: ${e}`);
    }
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkRemove(entity: string, ids: string[]): Promise<void> {
    try {
      this.#storeCache.getModel(entity).bulkRemove(ids, this.#context.blockHeight);

      for (const id of ids) {
        this.#context.operationStack?.put(OperationType.Remove, entity, id);
      }
    } catch (e) {
      throw new Error(`Failed to bulkRemove Entity ${entity}: ${e}`);
    }
  }
}
