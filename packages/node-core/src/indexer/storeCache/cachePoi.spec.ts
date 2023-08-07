// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {Op, Sequelize} from '@subql/x-sequelize';
import {PoiRepo, ProofOfIndex} from '../entities';
import {CachePoiModel} from './cachePoi';

const mockPoiRepo = (): PoiRepo => {
  const data: Record<number, any> = {};

  const ascKeys = () => (Object.keys(data) as any[] as number[]).sort((a: number, b: number) => a - b);
  const descKeys = () => [...ascKeys()].reverse();

  return {
    findByPk: (key: number) => ({toJSON: () => data[key]}),
    findAll: ({limit, order, where}: any) => {
      const orderedKeys = ascKeys();

      const startHeight = where.id[Op.gte];

      const filteredKeys = orderedKeys.filter((key) => key >= startHeight).slice(0, limit);

      return filteredKeys.map((key) => ({toJSON: () => data[key]}));
    },
    findOne: ({order, where}: any) => {
      const orderedKeys = descKeys();

      if (!orderedKeys.length) {
        return null;
      }

      if (!where) {
        return {toJSON: () => data[orderedKeys[0]]};
      }

      // Only support null mmrRoot
      for (const key of orderedKeys) {
        if (data[key].mmrRoot !== null && data[key].mmrRoot !== undefined) {
          return {toJSON: () => data[key]};
        }
      }

      return null;
    },
    bulkCreate: (input: {id: number}[], opts: any) => input.map((d) => (data[d.id] = d)),
    destroy: (key: number) => {
      delete data[key];
    },
  } as any as PoiRepo;
};

const getEmptyPoi = (id: number, mmrRoot?: any): ProofOfIndex => {
  return {
    id,
    chainBlockHash: new Uint8Array(),
    hash: new Uint8Array(),
    parentHash: new Uint8Array(),
    mmrRoot,
  } as ProofOfIndex;
};

jest.mock('@subql/x-sequelize', () => {
  let data: Record<string, any> = {};

  let pendingData: typeof data = {};
  let afterCommitHooks: Array<() => void> = [];

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
      getTableName: () => 'table1',
      sequelize: {
        escape: (key: any) => key,
        query: (sql: string, option?: any) => jest.fn(),
        fn: jest.fn().mockImplementation(() => {
          return {fn: 'int8range', args: [41204769, null]};
        }),
      },
      upsert: jest.fn(),
      associations: [{}, {}],
      count: 5,
      findAll: jest.fn().mockImplementation(async () => {
        await delay(5);
      }),
      findOne: jest.fn(({transaction, where: {id}}) => ({
        toJSON: () => (transaction ? pendingData[id] ?? data[id] : data[id]),
      })),
      bulkCreate: jest.fn((records: {id: string}[]) => {
        records.map((r) => (pendingData[r.id] = r));
      }),
      destroy: jest.fn(),
    }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(async () => {
        await delay(1);
        data = {...data, ...pendingData};
        pendingData = {};
        afterCommitHooks.map((fn) => fn());
        afterCommitHooks = [];
      }), // Delay of 1s is used to test whether we wait for cache to flush
      rollback: jest.fn(),
      afterCommit: jest.fn((fn) => afterCommitHooks.push(fn)),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('@subql/x-sequelize');
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
    QueryTypes: actualSequelize.QueryTypes,
    Deferrable: actualSequelize.Deferrable,
  };
});

describe('CachePoi', () => {
  let poiRepo: PoiRepo;
  let cachePoi: CachePoiModel;
  let sequelize: Sequelize;

  beforeEach(() => {
    poiRepo = mockPoiRepo();
    sequelize = new Sequelize();
    cachePoi = new CachePoiModel(poiRepo);
  });

  // This getPoiBlocksByRangeWithCache method is deprecated
  describe.skip('getPoiBlocksByRangeWithCache', () => {
    // We need to avoid this case.
    // This is an example showing merge data from Db and cache, while flush happened and cache data could be missing
    // Another lock can be implemented to race with flush
    // However consider performance factor, we try to get data from db only.
    it('missed data when fetch from db take long time, and set cache has been flushed', async () => {
      await poiRepo.bulkCreate([{id: 99}, {id: 100}, {id: 101}] as any);

      const tx = await sequelize.transaction();

      // upsert
      cachePoi.bulkUpsert([getEmptyPoi(200)]);
      cachePoi.bulkUpsert([getEmptyPoi(202)]);
      // Expect exist in setCache
      expect((cachePoi as any).setCache['200']).toBeDefined();
      expect((cachePoi as any).setCache['202']).toBeDefined();

      // Mock db findAll take longer than usual
      (cachePoi as any).plainPoiModel.getPoiBlocksByRange = jest.fn().mockImplementation(async () => {
        await delay(5);
        return [{id: 99}, {id: 100}, {id: 101}];
      });

      // while flush doesn't have to wait findAll completed, it could flush cache
      const [blocks] = await Promise.all([
        // mmrService
        cachePoi.getPoiBlocksByRangeWithCache(90),
        // StoreCache service
        cachePoi.flush(tx),
      ]);
      // Expected missing data
      expect(blocks.find((b) => b.id === 200)).toBeUndefined();
      expect(blocks.find((b) => b.id === 202)).toBeUndefined();
    }, 500000);

    it('with mix of cache and db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      cachePoi.bulkUpsert([getEmptyPoi(4)]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getPoiBlocksByRangeWithCache(2);
      expect(res.map((d) => d.id)).toEqual([2, 3, 4, 5, 6]);
    });

    it('only db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      const res = await cachePoi.getPoiBlocksByRangeWithCache(2);
      expect(res.map((d) => d.id)).toEqual([2, 3]);
    });

    it('only cache data', async () => {
      cachePoi.bulkUpsert([getEmptyPoi(4)]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getPoiBlocksByRangeWithCache(2);
      expect(res.map((d) => d.id)).toEqual([4, 5, 6]);
    });
  });

  describe('getLatestPoi', () => {
    it('with mix of cache and db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      cachePoi.bulkUpsert([getEmptyPoi(4)]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getLatestPoi();
      expect(res?.id).toBe(6);
    });

    it('only db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      const res = await cachePoi.getLatestPoi();
      expect(res?.id).toBe(3);
    });

    it('only cache data', async () => {
      cachePoi.bulkUpsert([getEmptyPoi(1)]);
      cachePoi.bulkUpsert([getEmptyPoi(2)]);
      cachePoi.bulkUpsert([getEmptyPoi(3)]);

      const res = await cachePoi.getLatestPoi();
      expect(res?.id).toBe(3);
    });
  });

  describe('getLatestPoiWithMmr', () => {
    it('with mix of cache and db data', async () => {
      await poiRepo.bulkCreate([
        {id: 1, mmrRoot: 'mmr1'},
        {id: 2, mmrRoot: 'mmr2'},
        {id: 3, mmrRoot: 'mmr3'},
      ] as any);

      cachePoi.bulkUpsert([getEmptyPoi(4, 'mmr4')]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getLatestPoiWithMmr();
      expect(res?.id).toBe(4);
    });

    it('only db data', async () => {
      await poiRepo.bulkCreate([{id: 1, mmrRoot: 'mmr1'}, {id: 2, mmrRoot: 'mmr2'}, {id: 3}] as any);

      const res = await cachePoi.getLatestPoiWithMmr();
      expect(res?.id).toBe(2);
    });

    it('only cache data', async () => {
      cachePoi.bulkUpsert([getEmptyPoi(1, 'mmr1')]);
      cachePoi.bulkUpsert([getEmptyPoi(2, 'mmr2')]);
      cachePoi.bulkUpsert([getEmptyPoi(3)]);

      const res = await cachePoi.getLatestPoiWithMmr();
      expect(res?.id).toBe(2);
    });
  });
});
