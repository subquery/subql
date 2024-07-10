// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
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
      findAll: jest.fn(() => [
        {
          toJSON: () => ({
            id: 'apple-05-sequelize',
            field1: 'set apple at block 5 with sequelize',
          }),
        },
      ]),
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

describe('Store Cache Service historical', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter, new SchedulerRegistry());
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

  // TODO move this test to cacheModel
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
});

describe('Store Cache flush with order', () => {
  let storeService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter, new SchedulerRegistry());
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
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter, new SchedulerRegistry());
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
    storeService = new StoreCacheService(sequelize, nodeConfig, eventEmitter, new SchedulerRegistry());
    storeService.init(false, false, {findByPk: () => Promise.resolve({toJSON: () => 1})} as any, undefined);
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
    await storeService.flushAndWaitForCapacity(true);
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
    await storeService.flushAndWaitForCapacity(true);
    const end = new Date().getTime();

    // Should be more than 1s, we set the db tx.commit to take 1s
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });
});
