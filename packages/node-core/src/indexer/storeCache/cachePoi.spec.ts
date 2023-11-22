// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {Op, Sequelize} from '@subql/x-sequelize';
import {PoiRepo, ProofOfIndex} from '../entities';
import {PlainPoiModel} from '../poi';
import {CachePoiModel} from './cachePoi';

const mockPoiRepo = (): PoiRepo => {
  const data: Record<number, any> = {};

  const ascKeys = () => (Object.keys(data) as any[] as number[]).sort((a: number, b: number) => a - b);
  const descKeys = () => [...ascKeys()].reverse();

  return {
    findByPk: (key: number) => ({toJSON: () => data[key]}),
    findAll: ({limit, order, where}: any) => {
      const orderedKeys = order[0][1] === 'DESC' ? descKeys() : ascKeys();

      const startHeight = where.id[Op.gte];
      let filteredKeys: number[] = orderedKeys;
      if (startHeight !== undefined) {
        filteredKeys = orderedKeys.filter((key) => key >= startHeight);
      } else {
        const startHeight = where.id[Op.lte];
        if (startHeight !== undefined) {
          filteredKeys = orderedKeys.filter((key) => key <= startHeight);
        }
      }

      return filteredKeys.slice(0, limit).map((key) => ({toJSON: () => data[key]}));
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

    describe('getPoiBlocksBefore', () => {
      beforeEach(async () => {
        // Store data
        cachePoi.bulkUpsert([
          {id: 1, chainBlockHash: '0x1111'},
          {id: 2, chainBlockHash: '0x2222'},
          {id: 3, chainBlockHash: '0x3333'},
          {id: 4, chainBlockHash: '0x4444'},
        ] as any);

        const tx = await sequelize.transaction();
        await cachePoi.flush(tx);
        await tx.commit();

        // Cache data
        cachePoi.bulkUpsert([
          {id: 5, chainBlockHash: '0x1234'},
          {id: 30, chainBlockHash: '0x5678'},
          {id: 120, chainBlockHash: '0x91011'},
        ] as any);
      });

      it('should hit the cache first', async () => {
        const results = await cachePoi.getPoiBlocksBefore(50, {limit: 2});

        expect(results.map((r) => r.id)).toEqual([30, 5]);
      });

      it('should be able to get data from just the store', async () => {
        const results = await cachePoi.getPoiBlocksBefore(4);

        expect(results.map((r) => r.id)).toEqual([4, 3, 2, 1]);
      });

      it('should be able to combine cache and store data', async () => {
        const results = await cachePoi.getPoiBlocksBefore(30);

        expect(results.map((r) => r.id)).toEqual([30, 5, 4, 3, 2, 1]);
      });
    });
  });
});
