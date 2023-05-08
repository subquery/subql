// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Op} from 'sequelize';
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

describe('CachePoi', () => {
  let poiRepo: PoiRepo;
  let cachePoi: CachePoiModel;

  beforeEach(() => {
    poiRepo = mockPoiRepo();
    cachePoi = new CachePoiModel(poiRepo);
  });

  describe('getPoiBlocksByRange', () => {
    it('with mix of cache and db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      cachePoi.bulkUpsert([getEmptyPoi(4)]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getPoiBlocksByRange(2);
      expect(res.map((d) => d.id)).toEqual([2, 3, 4, 5, 6]);
    });

    it('only db data', async () => {
      await poiRepo.bulkCreate([{id: 1}, {id: 2}, {id: 3}] as any);

      const res = await cachePoi.getPoiBlocksByRange(2);
      expect(res.map((d) => d.id)).toEqual([2, 3]);
    });

    it('only cache data', async () => {
      cachePoi.bulkUpsert([getEmptyPoi(4)]);
      cachePoi.bulkUpsert([getEmptyPoi(5)]);
      cachePoi.bulkUpsert([getEmptyPoi(6)]);

      const res = await cachePoi.getPoiBlocksByRange(2);
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
