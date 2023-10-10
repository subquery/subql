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

const getEmptyPoi = (id: number): ProofOfIndex => {
  return {
    id,
    chainBlockHash: new Uint8Array(),
    hash: new Uint8Array(),
    parentHash: new Uint8Array(),
  } as ProofOfIndex;
};

jest.mock('@subql/x-sequelize', () => {
  let data: Record<string, any> = {};

  let pendingData: typeof data = {};
  let afterCommitHooks: Array<() => void> = [];

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
        fn: jest.fn().mockImplementation(() => {
          return {fn: 'int8range', args: [41204769, null]};
        }),
      },
      upsert: jest.fn(),
      associations: [{}, {}],
      count: 5,
      findAll: jest.fn().mockImplementation(async (limit, order, where) => {
        console.log(``);
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
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
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

  describe('getPoiBlocksByRange', () => {
    it('getPoiBlocksByRange only db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      const res = await cachePoi.getPoiBlocksByRange(2);
      expect(res.map((d) => d.id)).toEqual([2, 3]);
    });
  });

  // describe('getPoiById', () => {
  //   it('with mix of cache and db data, it should use cache data', async () => {
  //     await poiRepo.bulkCreate([{id: 1, chainBlockHash: '0x1234'}, {id: 2, chainBlockHash: '0x5678'}, {id: 3}] as any);
  //     cachePoi.bulkUpsert([getEmptyPoi(1)]);
  //     const res = await cachePoi.getPoiById(1);
  //     expect(res?.chainBlockHash).not.toBe('0x1234');
  //     const res2 = await cachePoi.getPoiById(2);
  //     expect(res2?.chainBlockHash).toBe('0x5678');
  //   });
  // });

  describe('clear poi', () => {
    it('should clear all if blockHeight not provided', () => {
      cachePoi.bulkUpsert([
        {id: 5, chainBlockHash: '0x1234'},
        {id: 30, chainBlockHash: '0x5678'},
        {id: 120, chainBlockHash: '0x91011'},
      ] as any);
      cachePoi.clear();
      expect(cachePoi.flushableRecordCounter).toBe(0);
      expect((cachePoi as any).setCache).toStrictEqual({});
    });

    it('should clear with blockHeight', () => {
      cachePoi.bulkUpsert([
        {id: 5, chainBlockHash: '0x1234'},
        {id: 30, chainBlockHash: '0x5678'},
        {id: 120, chainBlockHash: '0x91011'},
      ] as any);
      cachePoi.clear(30);
      expect(cachePoi.flushableRecordCounter).toBe(1);
      // expect(cachePoi.getPoiById(120)).toBeDefined();
    });
  });
});
