// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Store as IStore, Entity, FieldsExpression, GetOptions} from '@subql/types-core';
import {Transaction} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {getLogger} from '../../logger';
import {monitorWrite} from '../../process';
import {handledStringify} from '../../utils';
import {IStoreModelService} from '../storeCache';
import {StoreOperations} from '../StoreOperations';
import {OperationType} from '../types';
import {EntityClass} from './entity';

const logger = getLogger('Store');

/* A context is provided to allow it to be updated by the owner of the class instance */
type Context = {
  blockHeight: number;
  transaction?: Transaction;
  operationStack?: StoreOperations;
  isIndexed: (entity: string, field: string) => boolean;
  isIndexedHistorical: (entity: string, field: string) => boolean;
};

export class Store implements IStore {
  /* These need to explicily be private using JS style private properties in order to not leak these in the sandbox */
  #config: NodeConfig;
  #storeModel: IStoreModelService;
  #context: Context;

  constructor(config: NodeConfig, storeModel: IStoreModelService, context: Context) {
    this.#config = config;
    this.#storeModel = storeModel;
    this.#context = context;
  }

  #queryLimitCheck(storeMethod: string, entity: string, options?: GetOptions<any>) {
    if (options) {
      if (options.limit && this.#config.queryLimit < options.limit) {
        logger.warn(
          `store ${storeMethod} for entity ${entity} with ${options.limit} records exceeds config limit ${
            this.#config.queryLimit
          }. Will use ${this.#config.queryLimit} as the limit.`
        );
      }

      options.limit = options.limit ? Math.min(options.limit, this.#config.queryLimit) : this.#config.queryLimit;
    }
  }

  async get<T extends Entity>(entity: string, id: string): Promise<T | undefined> {
    try {
      const raw = await this.#storeModel.getModel<T>(entity).get(id);
      monitorWrite(`-- [Store][get] Entity ${entity} ID ${id}, data: ${handledStringify(raw)}`);
      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to get Entity ${entity} with id ${id}: ${e}`);
    }
  }

  async getByField<T extends Entity>(
    entity: string,
    field: keyof T,
    value: T[keyof T] | T[keyof T][],
    options: GetOptions<T> = {}
  ): Promise<T[]> {
    try {
      const indexed = this.#context.isIndexed(entity, String(field));
      assert(indexed, `to query by field ${String(field)}, an index must be created on model ${entity}`);

      this.#queryLimitCheck('getByField', entity, options);

      const raw = await this.#storeModel
        .getModel<T>(entity)
        .getByFields([Array.isArray(value) ? [field, 'in', value] : [field, '=', value]], options);
      monitorWrite(`-- [Store][getByField] Entity ${entity}, data: ${handledStringify(raw)}`);
      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }

  async getByFields<T extends Entity>(
    entity: string,
    filter: FieldsExpression<T>[],
    options: GetOptions<T>
  ): Promise<T[]> {
    try {
      // Check that the fields are indexed
      filter.forEach((f) => {
        assert(
          this.#context.isIndexed(entity, String(f[0])),
          `to query by field ${String(f[0])}, an index must be created on model ${entity}`
        );
      });

      this.#queryLimitCheck('getByFields', entity, options);

      const raw = await this.#storeModel.getModel<T>(entity).getByFields(filter, options);
      monitorWrite(`-- [Store][getByFields] Entity ${entity}, data: ${handledStringify(raw)}`);
      return raw.map((v) => EntityClass.create<T>(entity, v, this)) as T[];
    } catch (e) {
      throw new Error(`Failed to getByFields Entity ${entity}: ${e}`);
    }
  }

  async getOneByField<T extends Entity>(entity: string, field: keyof T, value: T[keyof T]): Promise<T | undefined> {
    try {
      const indexed = this.#context.isIndexedHistorical(entity, field as string);
      assert(indexed, `to query by field ${String(field)}, a unique index must be created on model ${entity}`);
      const [raw] = await this.#storeModel
        .getModel<T>(entity)
        .getByFields([Array.isArray(value) ? [field, 'in', value] : [field, '=', value]], {limit: 1});
      monitorWrite(`-- [Store][getOneByField] Entity ${entity}, data: ${handledStringify(raw)}`);
      return EntityClass.create<T>(entity, raw, this);
    } catch (e) {
      throw new Error(`Failed to getOneByField Entity ${entity} with field ${String(field)}: ${e}`);
    }
  }

  async set(entity: string, _id: string, data: Entity): Promise<void> {
    try {
      await this.#storeModel.getModel(entity).set(_id, data, this.#context.blockHeight, this.#context.transaction);
      monitorWrite(
        `-- [Store][set] Entity ${entity}, height: ${this.#context.blockHeight}, data: ${handledStringify(data)}`
      );
      this.#context.operationStack?.put(OperationType.Set, entity, data);
    } catch (e) {
      throw new Error(`Failed to set Entity ${entity} with _id ${_id}: ${e}`);
    }
  }

  async bulkCreate(entity: string, data: Entity[]): Promise<void> {
    try {
      await this.#storeModel.getModel(entity).bulkCreate(data, this.#context.blockHeight, this.#context.transaction);
      for (const item of data) {
        this.#context.operationStack?.put(OperationType.Set, entity, item);
      }
      monitorWrite(
        `-- [Store][bulkCreate] Entity ${entity}, height: ${this.#context.blockHeight}, data: ${handledStringify(data)}`
      );
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }

  async bulkUpdate(entity: string, data: Entity[], fields?: string[]): Promise<void> {
    try {
      await this.#storeModel
        .getModel(entity)
        .bulkUpdate(data, this.#context.blockHeight, fields, this.#context.transaction);
      for (const item of data) {
        this.#context.operationStack?.put(OperationType.Set, entity, item);
      }
      monitorWrite(
        `-- [Store][bulkUpdate] Entity ${entity}, height: ${this.#context.blockHeight}, data: ${handledStringify(data)}`
      );
    } catch (e) {
      throw new Error(`Failed to bulkCreate Entity ${entity}: ${e}`);
    }
  }

  async remove(entity: string, id: string): Promise<void> {
    try {
      await this.#storeModel.getModel(entity).bulkRemove([id], this.#context.blockHeight, this.#context.transaction);
      this.#context.operationStack?.put(OperationType.Remove, entity, id);
      monitorWrite(`-- [Store][remove] Entity ${entity}, height: ${this.#context.blockHeight}, id: ${id}`);
    } catch (e) {
      throw new Error(`Failed to remove Entity ${entity} with id ${id}: ${e}`);
    }
  }

  async bulkRemove(entity: string, ids: string[]): Promise<void> {
    try {
      await this.#storeModel.getModel(entity).bulkRemove(ids, this.#context.blockHeight, this.#context.transaction);

      for (const id of ids) {
        this.#context.operationStack?.put(OperationType.Remove, entity, id);
      }
      monitorWrite(
        `-- [Store][remove] Entity ${entity}, height: ${this.#context.blockHeight}, ids: ${handledStringify(ids)}`
      );
    } catch (e) {
      throw new Error(`Failed to bulkRemove Entity ${entity}: ${e}`);
    }
  }
}
