// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {PgBasedMMRDB} from '../entities/Mmr.entitiy';
import {CachePgMmrDb} from './cacheMmr';

const getMockDb = () => {
  let leafLength = 0;
  let nodes: Record<number, Uint8Array> = {};

  return {
    getLeafLength: () => Promise.resolve(leafLength),
    setLeafLength: (length: number) => Promise.resolve((leafLength = length)),
    get: (key: number) => Promise.resolve(nodes[key]),
    set: (value: Uint8Array, key: number) => Promise.resolve((nodes[key] = value)),
    bulkSet: (entries: Record<string, Uint8Array>) => {
      nodes = {...nodes, ...entries};
    },
    getNodes: () => Promise.resolve(nodes),
    delete: (key: number) => delete nodes[key],
  } as any as PgBasedMMRDB;
};

describe('CacheMMR', () => {
  let cacheDb: CachePgMmrDb;
  let db: PgBasedMMRDB;

  beforeEach(() => {
    db = getMockDb();
    cacheDb = new CachePgMmrDb(db);
  });

  it('can getLeafLength', async () => {
    const spy = jest.spyOn(db, 'getLeafLength');

    expect(await cacheDb.getLeafLength()).toBe(0);
    expect(spy).toBeCalledTimes(1);

    await cacheDb.setLeafLength(100);

    expect(await cacheDb.getLeafLength()).toBe(100);
    expect(spy).toBeCalledTimes(1);
  });

  it('can setLeafLength', async () => {
    const spy = jest.spyOn(db, 'setLeafLength');

    await cacheDb.setLeafLength(100);
    expect(spy).toBeCalledTimes(1);
  });

  it('can get from cache', async () => {
    const spy = jest.spyOn(db, 'get');

    await cacheDb.set(new Uint8Array(4), 100);

    expect(await cacheDb.get(100)).toBeDefined();
    expect(spy).toBeCalledTimes(0);
  });

  it('can get from db', async () => {
    const spy = jest.spyOn(db, 'get');

    await db.set(new Uint8Array(4), 100);

    expect(await cacheDb.get(100)).toBeDefined();
    expect(spy).toBeCalledTimes(1);
  });

  it('can get nodes from db', async () => {
    const spy = jest.spyOn(db, 'getNodes');

    await cacheDb.getNodes();
    expect(spy).toBeCalledTimes(1);
  });

  it.skip('can set to db', async () => {
    const spy = jest.spyOn(db, 'set');
    const spyBulk = jest.spyOn(db, 'bulkSet');

    // Nothing will be set on the first entry
    await cacheDb.set(new Uint8Array(0), 0);
    expect(spy).toBeCalledTimes(0);

    // We bulk set every 10 items so we add 9 more
    for (let i = 1; i < 10; i++) {
      await cacheDb.set(new Uint8Array(i), i);
    }

    expect(spyBulk).toBeCalledTimes(1);
  });

  it('can delete nodes from caches', async () => {
    const spy = jest.spyOn(db, 'getNodes');

    for (let i = 0; i < 10; i++) {
      await db.set(new Uint8Array(i), i);
    }

    // Inserts from db into cache
    await cacheDb.get(1);
    // Insert into set cache
    await cacheDb.set(new Uint8Array(11), 11);

    await cacheDb.delete(1);
    await cacheDb.delete(11);

    expect(await cacheDb.get(1)).not.toBeDefined();
    expect(await cacheDb.get(11)).not.toBeDefined();

    expect(await db.get(1)).not.toBeDefined();
  });

  it('can get cached items when getting all nodes', async () => {
    for (let i = 1; i <= 15; i++) {
      await cacheDb.set(new Uint8Array(i), i);
    }

    expect(Object.keys(await cacheDb.getNodes()).length).toBe(15);
  });
});
