// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {delay} from '../../utils';
import {Exporter} from './exporters';
import {METADATA_ENTITY_NAME} from './metadata/utils';
import {BaseEntity, CachedModel} from './model';
import {StoreCacheService} from './storeCache.service';

const eventEmitter = new EventEmitter2();

type TestEntity = BaseEntity & {field1: string};

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
      getAttributes: jest.fn(() => ({id: null, field1: null})),
    }),
    sync: jest.fn(),
    transaction: () => {
      let afterCommits: Array<() => void> = [];
      return {
        commit: jest.fn(() => {
          afterCommits.forEach((fn) => fn());
          afterCommits = [];
          return delay(1);
        }), // Delay of 1s is used to test whether we wait for cache to flush
        rollback: jest.fn(),
        afterCommit: (fn: () => void) => afterCommits.push(fn),
      };
    },
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
  let storeCacheService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeCacheService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
  });

  it('could init store cache service and init cache for models', () => {
    storeCacheService.getModel('entity1');
    expect((storeCacheService as any).cachedModels.entity1).toBeDefined();
    expect((storeCacheService as any).cachedModels.entity2).toBeUndefined();
  });

  it('could set cache for multiple entities, also get from it', async () => {
    const entity1Model = storeCacheService.getModel<TestEntity>('entity1');
    const entity2Model = storeCacheService.getModel<TestEntity>('entity2');

    await entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    await entity2Model.set(
      'entity2_id_0x02',
      {
        id: 'entity2_id_0x02',
        field1: 'set at block 2',
      },
      2
    );

    // check from cache
    expect((storeCacheService as any).cachedModels.entity1.setCache.entity1_id_0x01).toBeDefined();
    const entity1Block1 = (await entity1Model.get('entity1_id_0x01')) as any;
    const entity2Block2 = (await entity2Model.get('entity2_id_0x02')) as any;
    expect(entity1Block1.field1).toBe('set at block 1');
    expect(entity2Block2.field1).toBe('set at block 2');
  });

  // TODO move this test to cacheModel
  it('set at different block height, will create historical records', async () => {
    const appleModel = storeCacheService.getModel<TestEntity>('apple');

    await appleModel.set(
      'apple-01',
      {
        id: 'apple-01',
        field1: 'set apple at block 1',
      },
      1
    );

    const appleEntity_b1 = await appleModel.get('apple-01');
    expect(appleEntity_b1!.field1).toBe('set apple at block 1');
    // Add new record, should create historical records for same id entity
    await appleModel.set(
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
    expect((storeCacheService as any).cachedModels.apple.setCache['apple-01']._latestIndex).toBe(1);

    // Historical values
    const historicalValue = (storeCacheService as any).cachedModels.apple.setCache['apple-01'].historicalValues;
    // should close the range index 0 historical record
    expect(historicalValue[0].startHeight).toBe(1);
    expect(historicalValue[0].endHeight).toBe(5);
    // latest historical record endHeight should be null
    expect(historicalValue[1].startHeight).toBe(5);
    expect(historicalValue[1].endHeight).toBe(null);
  });
});

describe('Store Cache flush with order', () => {
  let storeCacheService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {} as any;

  beforeEach(() => {
    storeCacheService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeCacheService.init(false, {} as any, undefined);
  });

  it('when set/remove multiple model entities, operation index should added to record in sequential order', async () => {
    const entity1Model = storeCacheService.getModel<TestEntity>('entity1');
    const entity2Model = storeCacheService.getModel<TestEntity>('entity2');

    await entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    await entity2Model.set(
      'entity2_id_0x02',
      {
        id: 'entity2_id_0x02',
        field1: 'set at block 2',
      },
      2
    );
    await entity1Model.bulkRemove(['entity1_id_0x01'], 3);
    const entity1 = (storeCacheService as any).cachedModels.entity1;
    expect(entity1.removeCache.entity1_id_0x01.operationIndex).toBe(3);
  });
});

describe('Store Cache flush with non-historical', () => {
  let storeCacheService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig: NodeConfig = {disableHistorical: true} as any;

  beforeEach(() => {
    storeCacheService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeCacheService.init(false, {} as any, undefined);
  });

  it('Same Id with multiple operations, when flush it should always pick up the latest operation', async () => {
    const entity1Model = storeCacheService.getModel<TestEntity>('entity1');

    //create Id 1
    await entity1Model.set(
      'entity1_id_0x01',
      {
        id: 'entity1_id_0x01',
        field1: 'set at block 1',
      },
      1
    );
    // remove Id 1 and 2
    await entity1Model.bulkRemove(['entity1_id_0x02'], 2);
    await entity1Model.bulkRemove(['entity1_id_0x01'], 3);

    // recreate id 1 again
    await entity1Model.set(
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
  let storeCacheService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig = {
    storeCacheThreshold: 2,
    storeCacheUpperLimit: 10,
  } as NodeConfig;

  beforeEach(() => {
    storeCacheService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeCacheService.init(false, {findByPk: () => Promise.resolve({toJSON: () => 1})} as any, undefined);
  });

  it('doesnt wait for flushing cache when threshold not met', async () => {
    const entity1Model = storeCacheService.getModel<TestEntity>('entity1');

    for (let i = 0; i < 5; i++) {
      await entity1Model.set(
        `entity1_id_0x0${i}`,
        {
          id: `entity1_id_0x0${i}`,
          field1: 'set at block 1',
        },
        1
      );
    }

    const start = new Date().getTime();
    await storeCacheService.flushAndWaitForCapacity(true);
    const end = new Date().getTime();

    // Should be less than 1s, we're not waiting
    expect(end - start).toBeLessThan(1000);
  });

  it('waits for flushing when threshold is met', async () => {
    const entity1Model = storeCacheService.getModel<TestEntity>('entity1');

    for (let i = 0; i < 15; i++) {
      await entity1Model.set(
        `entity1_id_0x0${i}`,
        {
          id: `entity1_id_0x0${i}`,
          field1: 'set at block 1',
        },
        1
      );
    }

    const start = new Date().getTime();
    await storeCacheService.flushAndWaitForCapacity(true);
    const end = new Date().getTime();

    // Should be more than 1s, we set the db tx.commit to take 1s
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });
});

describe('Store cache', () => {
  let storeCacheService: StoreCacheService;

  const sequelize = new Sequelize();
  const nodeConfig = {storeCacheTarget: 5, storeFlushInterval: 2} as NodeConfig;

  let targetHeight: number | undefined;

  beforeEach(() => {
    targetHeight = 103;
    storeCacheService = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
    storeCacheService.init(false, {findByPk: () => Promise.resolve({toJSON: () => 1})} as any, undefined);

    (storeCacheService as any).cachedModels[METADATA_ENTITY_NAME] = {
      find(key: string) {
        switch (key) {
          case 'lastProcessedHeight':
            return 0;
          case 'targetHeight':
            return targetHeight;
          default:
            throw new Error(`Not supported by test: ${key}`);
        }
      },
    };
  });

  describe('exporters', () => {
    // This makes sure exporting + flushing is atomic
    it('aborts the transaction if an exporter throws', async () => {
      const entity1Model = storeCacheService.getModel<TestEntity>('entity1');

      const errorExporter = {
        export: () => {
          return Promise.reject(new Error('Cant export'));
        },
        shutdown: () => Promise.resolve(),
      } satisfies Exporter;

      for (let i = 0; i < 5; i++) {
        await entity1Model.set(
          `entity1_id_0x0${i}`,
          {
            id: `entity1_id_0x0${i}`,
            field1: 'set at block 1',
          },
          1
        );
      }

      (entity1Model as unknown as CachedModel).addExporter(errorExporter);

      await expect(() => storeCacheService.flushData(true)).rejects.toThrow('Cant export');
    });
  });

  describe('flush interval', () => {
    let flushSpy: jest.SpyInstance<Promise<void>, [forceFlush?: boolean | undefined]>;

    beforeEach(async () => {
      // Setup initial data that is flushed so we have a last flushed time
      const entity1Model = storeCacheService.getModel<TestEntity>('entity1');
      await entity1Model.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: 'set at block 1',
        },
        1
      );
      await storeCacheService.flushData(true);

      flushSpy = jest.spyOn(storeCacheService, 'flushData');
    });

    it('force flushes at an interval', async () => {
      let x = 0;
      while (x <= 12) {
        await storeCacheService.applyPendingChanges(x, false);
        await delay(0.1);
        x++;
      }

      expect(flushSpy).toHaveBeenCalledWith(true);
    });

    it('always force flushes when near targetHeight', async () => {
      let x = 100;
      while (x < 105) {
        await storeCacheService.applyPendingChanges(x, false);
        await delay(0.1);
        x++;
      }

      expect(flushSpy).toHaveBeenCalledTimes(5);
      expect(flushSpy).toHaveBeenCalledWith(true);
    });

    it('applies pending changes without a targetHeight set', async () => {
      targetHeight = undefined;

      let x = 100;
      while (x < 105) {
        await storeCacheService.applyPendingChanges(x, false);
        await delay(0.1);
        x++;
      }

      expect(flushSpy).toHaveBeenCalled();
    });

    it('can force flush above the target height', async () => {
      let x = 100;
      while (x < 105) {
        await storeCacheService.applyPendingChanges(x, false);
        await delay(0.1);
        x++;
      }

      expect(flushSpy).toHaveBeenCalledTimes(5);
      expect(flushSpy).toHaveBeenCalledWith(true);
    });
  });
});
