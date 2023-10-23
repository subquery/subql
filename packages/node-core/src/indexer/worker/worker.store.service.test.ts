// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import path from 'path';
import {Store, Entity, FunctionPropertyNames} from '@subql/types-core';
import {Worker} from './worker.builder';
import {HostStore, storeHostFunctions} from './worker.store.service';

type EntityProps = Omit<EntityCls, NonNullable<FunctionPropertyNames<EntityCls>> | '_name'>;

class EntityCls implements Entity {
  constructor(public id: string, public field: string) {}

  get _name(): string {
    return 'EntityCls';
  }

  async save(): Promise<void> {
    return Promise.resolve();
  }
  static async remove(id: string): Promise<void> {
    assert(id !== null, 'Cannot remove Entity entity without an ID');
    return Promise.resolve();
  }

  static async get(id: string): Promise<EntityCls | undefined> {
    assert(id !== null && id !== undefined, 'Cannot get Entity entity without an ID');
    return Promise.resolve(undefined);
  }

  static create(record: EntityProps): EntityCls {
    assert(typeof record.id === 'string', 'id must be provided');
    const entity = new this(record.id, record.field);
    Object.assign(entity, record);
    return entity;
  }
}

type TestWorker = {callStoreFunction: (name: string, args: any[]) => Promise<void>};

describe('Worker Store Service', () => {
  let store: Store;
  let worker: Worker<HostStore> & TestWorker;

  beforeEach(() => {
    store = {
      get: jest.fn(),
      getByField: jest.fn(() => Promise.resolve([/*{ field: '1'} as any*/ new EntityCls('1', '1') as any])),
      getByFields: jest.fn(),
      getOneByField: jest.fn(),
      set: jest.fn(),
      bulkCreate: jest.fn(),
      bulkUpdate: jest.fn(),
      remove: jest.fn(),
      bulkRemove: jest.fn(),
    };

    worker = Worker.create<TestWorker, HostStore>(
      path.resolve(__dirname, '../../../dist/indexer/worker/test.store.worker.js'),
      ['callStoreFunction'],
      storeHostFunctions(store),
      '', // ROOT not needed,
      false
    );
  });

  afterEach(async () => {
    await worker.terminate();
  });

  it('can make a request with an object', async () => {
    const spy = jest.spyOn(store, 'getByField');

    await worker.callStoreFunction('getByField', ['Entity', 'field', '1', {offset: 0, limit: 1}]);

    expect(spy).toHaveBeenCalledWith('Entity', 'field', '1', {offset: 0, limit: 1});
  });

  it('can make a respone with an object', async () => {
    const spy = jest.spyOn(store, 'set');

    const entity = new EntityCls('1', '1');

    await worker.callStoreFunction('set', ['Entity', '1', entity]);

    expect(spy).toHaveBeenCalledWith('Entity', '1', entity);
  });
});
