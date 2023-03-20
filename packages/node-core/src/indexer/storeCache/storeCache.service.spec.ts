// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Op, Sequelize} from 'sequelize';
import {StoreCacheService} from './storeCache.service';

jest.mock('sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    Op: {
      in: jest.fn(),
      notIn: jest.fn(),
    },
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{nextval: 1}],
    showAllSchemas: () => ['subquery_1'],
    model: (entity: string) => ({
      upsert: jest.fn(),
      count: 5,
      findAll: [
        {
          id: 'apple-05-sequelize',
          field1: 'set apple at block 5 with sequelize',
        },
      ],
    }),
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

type Apple = {
  id: string;
  field1: string;
};

describe('Store Cache Service historical', () => {
  let storeService: StoreCacheService;

  const sequilize = new Sequelize();

  it('could init store cache service and init cache for models', () => {
    storeService = new StoreCacheService(sequilize, null);
    storeService.getModel('entity1');
    expect((storeService as any).cachedModels.entity1).toBeDefined();
    expect((storeService as any).cachedModels.entity2).toBeUndefined();
  });

  it('could set cache for multiple entities, also get from it', async () => {
    storeService = new StoreCacheService(sequilize, null);
    const entity1Model = storeService.getModel('entity1');
    const entity2Model = storeService.getModel('entity2');

    entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    entity2Model.set(
      'entity2_id_0x02',
      {
        id: 'entity2_id_0x02',
        field1: 'set at block 2',
      },
      2
    );

    // check from cache
    expect((storeService as any).cachedModels.entity1.setCache.entity1_id_0x01).toBeDefined();
    const entity1Block1 = (await entity1Model.get('entity1_id_0x01', null)) as any;
    const entity2Block2 = (await entity2Model.get('entity2_id_0x02', null)) as any;
    expect(entity1Block1.field1).toBe('set at block 1');
    expect(entity2Block2.field1).toBe('set at block 2');
  });

  it('set at different block height, will create historical records', async () => {
    storeService = new StoreCacheService(sequilize, null);
    const appleModel = storeService.getModel('apple');

    appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'set apple at block 1',
      },
      1
    );

    const appleEntity_b1 = (await appleModel.get('apple-01', null)) as any;
    expect(appleEntity_b1.field1).toBe('set apple at block 1');
    // Add new record, should create historical records for same id entity
    appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'updated apple at block 5',
      },
      5
    );
    const appleEntity_b5 = (await appleModel.get('apple-01', null)) as any;
    expect(appleEntity_b5.field1).toBe('updated apple at block 5');

    // Been pushed two records, the latest index should point to 1
    expect((storeService as any).cachedModels.apple.setCache['apple-01']._latestIndex).toBe(1);

    // Historical values
    const historicalValue = (storeService as any).cachedModels.apple.setCache['apple-01'].historicalValues;
    // should close the range index 0 historical record
    expect(historicalValue[0].startHeight).toBe(1);
    expect(historicalValue[0].endHeight).toBe(5);
    // latest historical record endHeight should be null
    expect(historicalValue[1].startHeight).toBe(5);
    expect(historicalValue[1].endHeight).toBe(null);
  });

  it('getAll, getOneByField and getByField with getFromCache', async () => {
    storeService = new StoreCacheService(sequilize, null);
    const appleModel = storeService.getModel<Apple>('apple');
    appleModel.set(
      'apple-05',
      {
        id: 'apple-05',
        field1: 'set apple at block 5',
      },
      5
    );
    // getOneByField
    const appleEntity_b5 = await appleModel.getOneByField('field1' as any, 'set apple at block 5', null);
    expect(appleEntity_b5.field1).toBe('set apple at block 5');
    appleModel.set(
      'apple-05-smith',
      {
        id: 'apple-05-smith',
        field1: 'set apple at block 5',
      },
      5
    );
    // getAll without pass any field and value, it should unify data
    const cacheData0 = (appleModel as any).getFromCache();
    expect(cacheData0).toStrictEqual([
      {field1: 'set apple at block 5', id: 'apple-05'},
      {field1: 'set apple at block 5', id: 'apple-05-smith'},
    ]);

    // getByField
    const appleEntity_b5_records = await appleModel.getByField('field1' as any, 'set apple at block 5', null, {
      limit: 2,
    });
    expect(appleEntity_b5_records.length).toBe(2);

    // TODO, getByField with offset and limit
    // const appleEntity_b5_records_2 = await appleModel.getByField('field1' as any, 'set apple at block 5', null, {
    //   offset:1,
    //   limit: 5,
    // });
    // expect(appleEntity_b5_records_2.length).toBe(1);

    // Manually remove data from setCache, it should look from getCache
    (appleModel as any).setCache = {};
    const cacheData1 = (appleModel as any).getFromCache('field1' as any, 'set apple at block 5');
    expect(cacheData1.length).toBe(2);
  });

  it('count', () => {
    storeService = new StoreCacheService(sequilize, null);
    const appleModel = storeService.getModel<Apple>('apple');
    appleModel.set(
      'apple-05',
      {
        id: 'apple-05',
        field1: 'set apple at block 5',
      },
      5
    );
    appleModel.set(
      'apple-05-smith',
      {
        id: 'apple-05-smith',
        field1: 'set apple at block 5',
      },
      5
    );

    // TODO mocked model.count result = 5
    // const count = await appleModel.count();
    // expect(count).toBe(7);
    const cacheData = (appleModel as any).getFromCache();
    expect(cacheData.length).toBe(2);
  });

  it('remove', async () => {
    storeService = new StoreCacheService(sequilize, null);
    const appleModel = storeService.getModel<Apple>('apple');

    appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'set apple at block 1',
      },
      1
    );

    appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'updated apple at block 5',
      },
      5
    );
    appleModel.remove('apple-01', 6);
    expect((appleModel as any).removeCache).toStrictEqual({'apple-01': {removedAtBlock: 6}});
    expect(await appleModel.get('apple-01', null)).toBeUndefined();

    // last value in setCache should end with block 6
    const historicalValue = (storeService as any).cachedModels.apple.setCache['apple-01'].historicalValues;
    expect(historicalValue[1].endHeight).toBe(6);
  });
});
