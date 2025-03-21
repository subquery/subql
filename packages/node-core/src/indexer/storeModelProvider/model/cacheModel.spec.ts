// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../../configure';
import {CachedModel} from './cacheModel';

jest.mock('@subql/x-sequelize', () => {
  let data: Record<string, any> = {};

  let pendingData: typeof data = {};
  let pendingDeletes: (keyof typeof data)[] = [];
  let afterCommitHooks: Array<() => void> = [];

  const transaction = () => ({
    commit: jest.fn(async () => {
      await delay(1);
      data = {...data, ...pendingData};
      for (const pendingDelete of pendingDeletes) {
        delete data[pendingDelete as string];
      }
      pendingData = {};
      pendingDeletes = [];
      afterCommitHooks.map((fn) => fn());
      afterCommitHooks = [];
    }), // Delay of 1s is used to test whether we wait for cache to flush
    rollback: jest.fn(),
    afterCommit: jest.fn((fn) => afterCommitHooks.push(fn)),
  });

  const mSequelize = {
    authenticate: jest.fn(),
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{nextval: 1}],
    showAllSchemas: () => ['subquery_1'],
    model: (entity: string) => ({
      getTableName: () => 'table1',
      sequelize: {
        escape: (key: any) => key,
        query: (sql: string, option?: any) => jest.fn(),
        fn: jest.fn().mockImplementation((_fn, ...args: unknown[]) => {
          if (_fn === 'int8range') {
            return {fn: _fn, args: [args[0], args[1] ?? null]};
          }
        }),
        transaction,
      },
      upsert: jest.fn(),
      associations: [{}, {}],
      count: 5,
      findAll: jest.fn(() => Object.values(data).map(({__block_range, ...d}) => ({toJSON: () => d}))),
      findOne: jest.fn(({transaction, where: {id}}) => ({
        toJSON: () => (transaction ? (pendingData[id] ?? data[id]) : data[id]),
      })),
      bulkCreate: jest.fn((records: {id: string}[]) => {
        records.map((r) => (pendingData[r.id] = r));
      }),
      destroy: jest.fn(({where: {id}}) => pendingDeletes.push(id)),
    }),
    sync: jest.fn(),
    transaction,
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('@subql/x-sequelize');
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => {
      // Reset all the data when creating new instances
      data = {};
      pendingData = {};
      pendingDeletes = [];
      afterCommitHooks = [];

      return mSequelize;
    }),
  };
});

describe('cacheModel', () => {
  let testModel: CachedModel<{id: string; field1: number}>;
  let sequelize: Sequelize;
  let blockHeight: number;

  const flush = async (height?: number) => {
    const tx = await sequelize.transaction();

    await testModel.flush(
      tx,
      height ?? blockHeight - 1 // Equivalent of last processed height
    );

    return tx.commit();
  };

  describe('without historical', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      blockHeight = 0;
      let i = 0;
      sequelize = new Sequelize();
      testModel = new CachedModel(sequelize.model('entity1'), false, {} as NodeConfig, () => i++);

      // Set an initial model and flush it
      blockHeight = 1;
      await testModel.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: 1,
        },
        blockHeight
      );
      await flush();
    });

    it('can avoid race conditions', async () => {
      // Get the entity and update again so we can have a difference between db and cache
      const entity1 = await testModel.get('entity1_id_0x01');
      if (!entity1) {
        throw new Error('Entity should exist');
      }

      // updated height to 2
      blockHeight = 2;
      await testModel.set(
        'entity1_id_0x01',
        {
          ...entity1,
          field1: entity1.field1 + 1,
        },
        2
      );

      // Clear the get cache to simulate many other operations happening
      (testModel as any).getCache.clear();

      // Flush and update the entity at the same time
      const pendingFlush = flush();

      await delay(0.2);
      const entity2 = await testModel.get('entity1_id_0x01');

      await testModel.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: (entity2?.field1 ?? 0) + 1,
        },
        3
      );

      await pendingFlush;

      const finalEntity = await testModel.get('entity1_id_0x01');
      expect(finalEntity?.field1).toEqual(3);
    });

    it('can call getByFields, with entities updated in the same block', async () => {
      blockHeight = 2;
      await testModel.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: 2,
        },
        blockHeight
      );

      const result = await testModel.getByFields(
        [
          ['id', '=', 'entity1_id_0x01'],
          ['field1', '=', 2],
        ],
        {offset: 0, limit: 100}
      );

      expect(result).toEqual([
        {
          id: 'entity1_id_0x01',
          field1: 2,
        },
      ]);
    });

    it('cannot mutate data in the cache without calling methods', async () => {
      await testModel.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: 2,
        },
        2
      );

      /* get usese the get cache */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const entity = (await testModel.get('entity1_id_0x01'))!;

      expect(entity).toBeDefined();

      // Mutate field directly
      entity.field1 = -1;

      const entity2 = await testModel.get('entity1_id_0x01');
      expect(entity2?.field1).toEqual(2);

      /* getBy methods use set cache */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const [entity3] = (await testModel.getByFields([['field1', '=', 2]], {limit: 1}))!;
      expect(entity3?.field1).toEqual(2);

      // Mutate field directly
      entity3.field1 = -2;

      const [entity4] = await testModel.getByFields([['field1', '=', 2]], {limit: 1});
      expect(entity4?.field1).toEqual(2);
    });
  });

  describe('historical', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      let i = 0;
      sequelize = new Sequelize();
      testModel = new CachedModel(sequelize.model('entity1'), 'height', {} as NodeConfig, () => i++);
    });

    it('throws when trying to set undefined', async () => {
      await expect(() => testModel.set('0x01', undefined as any, 1)).rejects.toThrow();
      await expect(() => testModel.set('0x01', null as any, 1)).rejects.toThrow();
    });

    // it should keep same behavior as hook we used
    it('when get data after flushed, it should exclude block range', async () => {
      const spyDbGet = jest.spyOn(testModel.model, 'findOne');
      const sypOnApplyBlockRange = jest.spyOn(testModel as any, 'applyBlockRange');
      await testModel.set(
        'entity1_id_0x01',
        {
          id: 'entity1_id_0x01',
          field1: 1,
        },
        1
      );
      await flush(1);
      // the block range has been set
      expect(sypOnApplyBlockRange).toHaveBeenCalledTimes(1);

      const entity = await testModel.get('entity1_id_0x01');
      if (!entity) {
        throw new Error('Entity should exist');
      }
      // should read from get cache, and entity should exclude __block_range
      expect(spyDbGet).not.toHaveBeenCalled();
      expect(JSON.stringify(entity)).not.toContain('__block_range');
    });

    // TODO, getByFields still works

    // Some edge cases for set get and remove
    describe('set, remove and get', () => {
      it('In different block, remove and set, should able to get', async () => {
        await testModel.remove('entity1_id_0x01', 4);
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 5,
          },
          6
        );
        const result = await testModel.get('entity1_id_0x01');
        expect(result?.field1).toBe(5);
      });

      it('In same block, remove then set, should able to get', async () => {
        await testModel.remove('entity1_id_0x01', 1);
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        const result = await testModel.get('entity1_id_0x01');
        // data should be erased from removeCache
        expect((testModel as any).removeCache.entity1_id_0x01).toBeUndefined();

        expect(result).toBeDefined();
      });

      it('In different block, remove and set, then remove again, should get nothing', async () => {
        await testModel.remove('entity1_id_0x01', 4);
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 5,
          },
          6
        );
        await testModel.remove('entity1_id_0x01', 8);
        const result = await testModel.get('entity1_id_0x01');
        expect((testModel as any).removeCache.entity1_id_0x01).toBeDefined();
        // should match with last removed
        expect((testModel as any).removeCache.entity1_id_0x01.removedAtBlock).toBe(8);

        // check set cache, mark as removed
        const latestSetRecord = (testModel as any).setCache.entity1_id_0x01.historicalValues[0];
        expect(latestSetRecord.removed).toBeTruthy();
        expect(latestSetRecord.endHeight).toBe(8);
        expect(result).toBeUndefined();
      });

      it('In same block, remove and set, then remove again, should get nothing', async () => {
        await testModel.remove('entity1_id_0x01', 1);
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        await testModel.remove('entity1_id_0x01', 1);
        const result = await testModel.get('entity1_id_0x01');
        expect((testModel as any).removeCache.entity1_id_0x01).toBeDefined();

        const latestSetRecord = (testModel as any).setCache.entity1_id_0x01.historicalValues[0];
        // marked set record as removed
        expect(latestSetRecord.removed).toBeTruthy();
        expect(latestSetRecord.endHeight).toBe(1);
        expect(result).toBeUndefined();
      });

      it('clean flushable records when applyBlockRange, if found set and removed happened in the same height', async () => {
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        await testModel.remove('entity1_id_0x01', 1);

        await testModel.set(
          'entity1_id_0x02',
          {
            id: 'entity1_id_0x02',
            field1: 2,
          },
          2
        );
        expect((testModel as any).removeCache.entity1_id_0x01).toBeDefined();

        const latestSetRecord = (testModel as any).setCache.entity1_id_0x01.historicalValues[0];
        // marked set record as removed
        expect(latestSetRecord.removed).toBeTruthy();
        expect(latestSetRecord.startHeight).toBe(1);
        expect(latestSetRecord.endHeight).toBe(1);
        const records = (testModel as any).applyBlockRange((testModel as any).setCache);
        // should filter out id 1
        expect(records.length).toBe(1);
        expect(records[0].id).toBe('entity1_id_0x02');
      });

      it('clean flushable records when applyBlockRange, pass if set and remove in the different height', async () => {
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        await testModel.remove('entity1_id_0x01', 2);

        await testModel.set(
          'entity1_id_0x02',
          {
            id: 'entity1_id_0x02',
            field1: 2,
          },
          2
        );
        expect((testModel as any).removeCache.entity1_id_0x01).toBeDefined();
        const records = (testModel as any).applyBlockRange((testModel as any).setCache);
        expect(records.length).toBe(2);
        expect(records[0].id).toBe('entity1_id_0x01');
        expect(records[0].__block_range).toStrictEqual({args: [1, 2], fn: 'int8range'});
        expect(records[1].id).toBe('entity1_id_0x02');
        expect(records[1].__block_range).toStrictEqual({args: [2, null], fn: 'int8range'});
      });

      it('getFromCache could filter out removed data', async () => {
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        await testModel.remove('entity1_id_0x01', 1);

        await testModel.set(
          'entity1_id_0x02',
          {
            id: 'entity1_id_0x02',
            field1: 1,
          },
          2
        );
        const spyFindAll = jest.spyOn(testModel.model, 'findAll');
        const result = await testModel.getByFields([['field1', '=', 1]], {offset: 0, limit: 50});
        expect(spyFindAll).toHaveBeenCalledTimes(1);

        expect(result).toStrictEqual([
          {id: 'entity1_id_0x02', field1: 1}, //Filtered out removed record
        ]);
      });

      it('getFromCache with removed and set again data', async () => {
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 3,
          },
          1
        );
        await testModel.remove('entity1_id_0x01', 1);
        await testModel.set(
          'entity1_id_0x01',
          {
            id: 'entity1_id_0x01',
            field1: 1,
          },
          1
        );
        const spyFindAll = jest.spyOn(testModel.model, 'findAll');
        const result = await testModel.getByFields([['field1', '=', 1]], {offset: 0, limit: 50});
        expect(spyFindAll).toHaveBeenCalledTimes(1);
        expect(result).toStrictEqual([{id: 'entity1_id_0x01', field1: 1}]);

        // Should not include any previous recorded value
        const result3 = await testModel.getByFields([['field1', '=', 3]], {offset: 0, limit: 50});
        // Expect only mocked
        expect(result3).toStrictEqual([]);
      });
    });

    describe('getByFields', () => {
      it('allows empty filter', async () => {
        await expect(
          testModel.getByFields(
            // Any needed to get past type check
            [],
            {offset: 0, limit: 1}
          )
        ).resolves.not.toThrow();
      });

      it('throws for unsupported operators', async () => {
        await expect(
          testModel.getByFields(
            // Any needed to get past type check
            [['field1', 'badOperator' as any, 1]],
            {offset: 0, limit: 1}
          )
        ).rejects.toThrow(`Operator ('badOperator') for field field1 is not valid. Options are =, !=, in, !in`);
      });
    });
  });
});
