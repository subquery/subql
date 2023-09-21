// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {delay} from '../../utils';
import {StoreCacheService} from './storeCache.service';

const eventEmitter = new EventEmitter2();

jest.mock('@subql/x-sequelize', () => {
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
      associations: [{}, {}],
      count: 5,
      findAll: [
        {
          id: 'apple-05-sequelize',
          field1: 'set apple at block 5 with sequelize',
        },
      ],
      bulkCreate: jest.fn(),
      destroy: jest.fn(),
    }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(() => delay(1)), // Delay of 1s is used to test whether we wait for cache to flush
      rollback: jest.fn(),
      afterCommit: jest.fn(),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('@subql/x-sequelize');
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
  };
});

jest.setTimeout(200000);

type Apple = {
  id: string;
  field1: string;
};

describe('Store Cache Service historical', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
  });

  it('could init store cache service and init cache for models', () => {
    storeService.getModel('entity1');
    expect((storeService as any).cachedModels.entity1).toBeDefined();
    expect((storeService as any).cachedModels.entity2).toBeUndefined();
  });

  it('could set cache for multiple entities, also get from it', async () => {
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
    const entity1Block1 = (await entity1Model.get('entity1_id_0x01')) as any;
    const entity2Block2 = (await entity2Model.get('entity2_id_0x02')) as any;
    expect(entity1Block1.field1).toBe('set at block 1');
    expect(entity2Block2.field1).toBe('set at block 2');
  });

  it('set at different block height, will create historical records', async () => {
    const appleModel = storeService.getModel('apple');

    appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'set apple at block 1',
      },
      1
    );

    const appleEntity_b1 = (await appleModel.get('apple-01')) as any;
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
    const appleEntity_b5 = (await appleModel.get('apple-01')) as any;
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
    const appleEntity_b5 = await appleModel.getOneByField('field1' as any, 'set apple at block 5');
    expect(appleEntity_b5?.field1).toBe('set apple at block 5');
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
    const appleEntity_b5_records = await appleModel.getByField('field1' as any, 'set apple at block 5', {
      limit: 2,
      offset: 0,
    });
    expect(appleEntity_b5_records?.length).toBe(2);

    // TODO, getByField with offset and limit
    // const appleEntity_b5_records_2 = await appleModel.getByField('field1' as any, 'set apple at block 5', null, {
    //   offset:1,
    //   limit: 5,
    // });
    // expect(appleEntity_b5_records_2.length).toBe(1);

    // Manually remove data from setCache, it should look from getCache
    (appleModel as any).setCache = {};
    (appleModel as any).getCache.set('apple-get-id1', {id: 'apple-get-id1', field1: 'set apple at block 5'});
    const cacheData1 = (appleModel as any).getFromCache('field1' as any, 'set apple at block 5');
    // This will work due to getCache keeps duplicate data from setCache in the .set method
    expect(cacheData1).toStrictEqual([
      {id: 'apple-get-id1', field1: 'set apple at block 5'},
      {field1: 'set apple at block 5', id: 'apple-05-smith'},
      {field1: 'set apple at block 5', id: 'apple-05'},
    ]);
  });

  it('count', () => {
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
    expect((appleModel as any).removeCache).toStrictEqual({'apple-01': {operationIndex: 3, removedAtBlock: 6}});
    expect(await appleModel.get('apple-01')).toBeUndefined();

    // last value in setCache should end with block 6
    const historicalValue = (storeService as any).cachedModels.apple.setCache['apple-01'].historicalValues;
    expect(historicalValue[1].endHeight).toBe(6);
  });
});

describe('Store Cache flush with order', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeService.init(false, true, {} as any, undefined);
  });

  it('when set/remove multiple model entities, operation index should added to record in sequential order', () => {
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
    entity1Model.remove('entity1_id_0x01', 3);
    const entity1 = (storeService as any).cachedModels.entity1;
    expect(entity1.removeCache.entity1_id_0x01.operationIndex).toBe(3);
  });
});

describe('Store Cache flush with non-historical', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {disableHistorical: true} as any;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeService.init(false, false, {} as any, undefined);
  });

  it('Same Id with multiple operations, when flush it should always pick up the latest operation', async () => {
    const entity1Model = storeService.getModel('entity1');

    //create Id 1
    entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    // remove Id 1 and 2
    entity1Model.remove('entity1_id_0x02', 2);
    entity1Model.remove('entity1_id_0x01', 3);

    // recreate id 1 again
    entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 5',
      },
      5
    );

    //simulate flush here
    const tx = await sequelize.transaction();
    await (entity1Model as any).flush(tx, 5);

    const sequelizeModel1 = (entity1Model as any).model;
    const spyModel1Create = jest.spyOn(sequelizeModel1, 'bulkCreate');
    const spyModel1Destroy = jest.spyOn(sequelizeModel1, 'destroy');

    // Only last set record with block 5 is created
    expect(spyModel1Create).toHaveBeenCalledWith([{field1: 'set at block 5', id: 'entity1_id_0x01'}], {
      transaction: tx,
      updateOnDuplicate: ['id', 'field1'],
    });
    // remove id 2 only
    expect(spyModel1Destroy).toHaveBeenCalledWith({transaction: tx, where: {id: ['entity1_id_0x02']}});
  });
});

describe('Store cache upper threshold', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig = {
    storeCacheThreshold: 2,
    storeCacheUpperLimit: 10,
  } as NodeConfig;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeService.init(false, false, {} as any, undefined);
  });

  it('doesnt wait for flushing cache when threshold not met', async () => {
    const entity1Model = storeService.getModel('entity1');

    for (let i = 0; i < 5; i++) {
      entity1Model.set(
        `entity1_id_0x0${i}`,
        {
          id: `entity1_id_0x0${i}`,
          field1: 'set at block 1',
        },
        1
      );
    }

    const start = new Date().getTime();
    await storeService.flushAndWaitForCapacity(true, true);
    const end = new Date().getTime();

    // Should be less than 1s, we're not waiting
    expect(end - start).toBeLessThan(1000);
  });

  it('waits for flushing when threshold is met', async () => {
    const entity1Model = storeService.getModel('entity1');

    for (let i = 0; i < 15; i++) {
      entity1Model.set(
        `entity1_id_0x0${i}`,
        {
          id: `entity1_id_0x0${i}`,
          field1: 'set at block 1',
        },
        1
      );
    }

    const start = new Date().getTime();
    await storeService.flushAndWaitForCapacity(true, true);
    const end = new Date().getTime();

    // Should be more than 1s, we set the db tx.commit to take 1s
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });
});
