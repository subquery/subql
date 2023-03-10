// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {StoreCacheService} from '@subql/node-core';
import {Sequelize} from 'sequelize';

jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{nextval: 1}],
    showAllSchemas: () => ['subquery_1'],
    model: (entity: string) => ({upsert: jest.fn()}),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
      afterCommit: jest.fn(),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('sequelize');
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
    QueryTypes: actualSequelize.QueryTypes,
  };
});

jest.setTimeout(200000);

describe('Store Cache Service historical', () => {
  let storeService: StoreCacheService;

  const sequilize = new Sequelize();

  it('could init store cache service and init cache for models', () => {
    storeService = new StoreCacheService(sequilize, null);
    storeService.getModel('entity1');
    expect((storeService as any).cachedModels.entity1).toBeDefined();
    expect((storeService as any).cachedModels.entity2).toBeUndefined();
  });

  it('could set cache for entity, also get from it', async () => {
    storeService = new StoreCacheService(sequilize, null);
    storeService.getModel('entity1');
    storeService.getModel('entity2');

    (storeService as any).cachedModels.entity1.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    (storeService as any).cachedModels.entity1.set(
      'entity1_id_0x02',
      {
        id: 'entity1_id_0x02',
        field1: 'set at block 2',
      },
      2
    );

    expect((storeService as any).cachedModels.entity1.setCache.entity1_id_0x01).toBeDefined();

    const entity1Block1 = await (storeService as any).cachedModels.entity1.get('entity1_id_0x01');
    // expect(entity1.field1).toBe('set at block 1')
    const entity1Block2 = await (storeService as any).cachedModels.entity1.get('entity1_id_0x02');
    // expect(entity2.field1).toBe('set at block 2')
  });
});
