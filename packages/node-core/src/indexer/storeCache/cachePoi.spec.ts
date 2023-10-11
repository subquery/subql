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
  });
});
