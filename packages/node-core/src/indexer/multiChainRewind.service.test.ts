// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {buildSchemaFromString} from '@subql/utils';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {DbOption} from '../db';
import {delay} from '../utils';
import {MultiChainRewindStatus} from './entities';
import {MultiChainRewindService} from './multiChainRewind.service';
import {StoreService} from './store.service';
import {PlainStoreModelService} from './storeModelProvider';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(60000);
// Mock 1740100000 is the timestamp of the genesis block
const genBlockTimestamp = (height: number) => {
  const rewindTimestamp = (1740100000 + height) * 1000;
  return {rewindTimestamp, rewindDate: new Date(rewindTimestamp)};
};

const testSchemaName = 'test_multi_chain_rewind';
const schema = buildSchemaFromString(`
  type Account @entity {
    id: ID! # Account address
    balance: Int
  }
`);

async function createChainProject(chainId: string, mockBlockchainService: any, sequelize: Sequelize) {
  const nodeConfig = new NodeConfig({
    subquery: 'test',
    dbSchema: testSchemaName,
    proofOfIndex: true,
    enableCache: false,
    multiChain: true,
  });
  const project = {network: {chainId}, schema} as any;
  const dbModel = new PlainStoreModelService(sequelize, nodeConfig);
  const storeService = new StoreService(sequelize, nodeConfig, dbModel, project);
  await storeService.initCoreTables(testSchemaName);
  const tx = await sequelize.transaction();
  await storeService.init(testSchemaName, tx);
  await storeService.modelProvider.metadata.set('chain', chainId, tx);
  await storeService.modelProvider.metadata.set('startHeight', 1, tx);
  await storeService.modelProvider.metadata.set('lastProcessedHeight', 10000, tx);
  await storeService.modelProvider.metadata.set(
    'lastProcessedBlockTimestamp',
    genBlockTimestamp(10000).rewindTimestamp,
    tx
  );
  await tx.commit();

  const multiChainRewindService = new MultiChainRewindService(
    nodeConfig,
    sequelize,
    storeService,
    mockBlockchainService
  );

  const reindex = jest.fn();

  // Initialize the service
  await multiChainRewindService.init(chainId, reindex);

  return {sequelize, storeService, multiChainRewindService};
}

describe('MultiChain Rewind Service', () => {
  const notifyHandleDelay = 0.5;
  const lockInfoSql = `SELECT "chainId","rewindTimestamp","status" FROM "${testSchemaName}"."_global";`;

  const chainId1 = 'chain1';
  const chainId2 = 'chain2';
  let sequelize: Sequelize;
  let sequelize1: Sequelize;
  let sequelize2: Sequelize;
  let storeService1: StoreService, multiChainRewindService1: MultiChainRewindService;
  let storeService2: StoreService, multiChainRewindService2: MultiChainRewindService;

  // Mock IBlockchainService
  const mockBlockchainService = {
    getHeaderForHeight: jest.fn((height: number) => ({
      blockHeight: height,
      timestamp: genBlockTimestamp(height).rewindDate,
      blockHash: `hash${height}`,
      parentHash: height > 0 ? `hash${height - 1}` : '',
    })),
  };

  beforeEach(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();
    await sequelize.query(`CREATE SCHEMA ${testSchemaName};`);

    sequelize1 = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    const projectChain1 = await createChainProject(chainId1, mockBlockchainService, sequelize1);
    storeService1 = projectChain1.storeService;
    multiChainRewindService1 = projectChain1.multiChainRewindService;

    sequelize2 = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    const projectChain2 = await createChainProject(chainId2, mockBlockchainService, sequelize2);
    storeService2 = projectChain2.storeService;
    multiChainRewindService2 = projectChain2.multiChainRewindService;
  });

  afterEach(async () => {
    await multiChainRewindService1.onApplicationShutdown();
    await multiChainRewindService2.onApplicationShutdown();
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    await sequelize.close();
  });

  describe('acquireGlobalRewindLock', () => {
    it('setGlobalRewindLock should set the lock timestamp', async () => {
      const {rewindDate} = genBlockTimestamp(5);
      const result = await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);
      expect(result).toEqual(true);

      const res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual(
        expect.arrayContaining([
          {chainId: chainId1, rewindTimestamp: rewindDate, status: MultiChainRewindStatus.Incomplete},
          {chainId: chainId2, rewindTimestamp: rewindDate, status: MultiChainRewindStatus.Incomplete},
        ])
      );
    });

    it('A rewind can be moved further back when there is already one in progress.', async () => {
      const {rewindDate: rewindDate10} = genBlockTimestamp(10);
      const {rewindDate: rewindDate5} = genBlockTimestamp(5);

      await expect(multiChainRewindService1.acquireGlobalRewindLock(rewindDate10)).resolves.toBe(true);
      let res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual(
        expect.arrayContaining([
          {chainId: chainId1, rewindTimestamp: rewindDate10, status: MultiChainRewindStatus.Incomplete},
          {chainId: chainId2, rewindTimestamp: rewindDate10, status: MultiChainRewindStatus.Incomplete},
        ])
      );

      await expect(multiChainRewindService1.acquireGlobalRewindLock(rewindDate5)).resolves.toBe(true);
      res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual(
        expect.arrayContaining([
          {chainId: chainId1, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
          {chainId: chainId2, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
        ])
      );
    });

    it('Not allowed to lock further backward', async () => {
      const {rewindDate: rewindDate10} = genBlockTimestamp(10);
      const {rewindDate: rewindDate5} = genBlockTimestamp(5);

      await expect(multiChainRewindService1.acquireGlobalRewindLock(rewindDate5)).resolves.toBe(true);
      let res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual(
        expect.arrayContaining([
          {chainId: chainId1, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
          {chainId: chainId2, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
        ])
      );

      await expect(multiChainRewindService1.acquireGlobalRewindLock(rewindDate10)).resolves.toBe(false);
      res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual(
        expect.arrayContaining([
          {chainId: chainId1, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
          {chainId: chainId2, rewindTimestamp: rewindDate5, status: MultiChainRewindStatus.Incomplete},
        ])
      );
    });

    it('Only one can successfully acquire the lock.', async () => {
      const {rewindDate: rewindDate1} = genBlockTimestamp(5);
      const {rewindDate: rewindDate2} = genBlockTimestamp(5);

      const results = await Promise.allSettled([
        multiChainRewindService1.acquireGlobalRewindLock(rewindDate1),
        multiChainRewindService2.acquireGlobalRewindLock(rewindDate2),
      ]);

      const success = results.filter((result) => result.status === 'fulfilled');
      const failures = results.filter((result) => result.status === 'rejected');

      expect(success.length).toBe(1);
      expect(failures.length).toBe(1);
    });
  });

  describe('releaseChainRewindLock', () => {
    const {rewindDate} = genBlockTimestamp(5);
    beforeEach(async () => {
      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);
    });
    it('Same height as the target, release lock', async () => {
      const tx = await sequelize1.transaction();
      const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
      await tx.commit();

      expect(remaining).toBe(1);
    });

    it('Different height from the target, release failed.', async () => {
      const tx = await sequelize1.transaction();
      await expect(multiChainRewindService1.releaseChainRewindLock(tx, new Date())).rejects.toThrow();
      await tx.rollback();
    });

    it('The height of rewindLock is greater than or equal to lastProcessHeight, it can be forcibly released.', async () => {
      const {rewindDate: allowLastDate} = genBlockTimestamp(5);

      const tx = await sequelize1.transaction();
      const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate, allowLastDate);
      await tx.commit();
      expect(remaining).toBe(1);
    });

    it('rewindLock is less than lastProcessHeight, it cannot be forcibly released.', async () => {
      const {rewindDate: allowLastDate} = genBlockTimestamp(6);
      const tx = await sequelize1.transaction();
      await expect(multiChainRewindService1.releaseChainRewindLock(tx, rewindDate, allowLastDate)).rejects.toThrow();
      await tx.rollback();
    });
  });

  describe('The situation where notifyHandle controls the state', () => {
    it('A chain rollback has been completed.', async () => {
      const {rewindDate} = genBlockTimestamp(5);
      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);
      await delay(notifyHandleDelay);
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Incomplete);

      const tx = await sequelize1.transaction();
      const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
      await tx.commit();
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);

      await delay(notifyHandleDelay);
      expect(remaining).toBe(1);
      expect(multiChainRewindService2.status).toEqual(MultiChainRewindStatus.Incomplete);
      expect(multiChainRewindService2.waitRewindHeader).toEqual({
        blockHash: 'hash5',
        blockHeight: 5,
        parentHash: 'hash4',
        timestamp: rewindDate,
      });
    });

    it('should handle multiple concurrent rewind requests', async () => {
      const {rewindDate: rewindDate1} = genBlockTimestamp(5);
      const {rewindDate: rewindDate2} = genBlockTimestamp(3); // Earlier timestamp

      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate1);
      await delay(notifyHandleDelay);
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Incomplete);

      await multiChainRewindService2.acquireGlobalRewindLock(rewindDate2);
      await delay(notifyHandleDelay);
      expect(multiChainRewindService2.status).toBe(MultiChainRewindStatus.Incomplete);

      // The rewindTimestamp of the later chain will overwrite that of the earlier chain.
      const res = await sequelize.query(lockInfoSql, {type: QueryTypes.SELECT});
      expect(res).toEqual([
        {chainId: chainId1, rewindTimestamp: rewindDate2, status: MultiChainRewindStatus.Incomplete},
        {chainId: chainId2, rewindTimestamp: rewindDate2, status: MultiChainRewindStatus.Incomplete},
      ]);

      // Rollback to rewindDate1 is not allowed because it has already been overwritten.
      let remaining = 2;
      let tx = await sequelize1.transaction();
      await expect(multiChainRewindService1.releaseChainRewindLock(tx, rewindDate1)).rejects.toThrow();
      await tx.rollback();
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Incomplete);

      // Rollback to rewindDate2 is allowed.
      tx = await sequelize1.transaction();
      remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate2);
      await tx.commit();
      expect(remaining).toBe(1);
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);

      // Chain2 has started rolling back.
      tx = await sequelize2.transaction();
      remaining = await multiChainRewindService2.releaseChainRewindLock(tx, rewindDate2);
      await tx.commit();
      // This can fail because the notification has already come in and the status is back to normal
      expect(multiChainRewindService2.status).toBe(MultiChainRewindStatus.Complete);

      await delay(notifyHandleDelay);
      // The last chain rollback is complete, all chains have finished rolling back.
      expect(remaining).toBe(0);
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Normal);
      expect(multiChainRewindService2.status).toBe(MultiChainRewindStatus.Normal);
    });

    it('should handle binary search edge cases for timestamp matching', async () => {
      // Mock the binary search to simulate a large gap between blocks
      const mockGetHeaderByBinarySearch = jest.spyOn(multiChainRewindService1 as any, 'getHeaderByBinarySearch');
      mockGetHeaderByBinarySearch.mockResolvedValueOnce({
        blockHeight: 4,
        timestamp: genBlockTimestamp(4).rewindDate,
        blockHash: 'hash4',
        parentHash: 'hash3',
      });

      const {rewindDate} = genBlockTimestamp(4.5); // Timestamp between blocks 4 and 5
      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);
      await delay(notifyHandleDelay);
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Incomplete);
      expect(mockGetHeaderByBinarySearch).toHaveBeenCalledWith(expect.any(Date));
      expect(multiChainRewindService1.waitRewindHeader).toEqual({
        blockHeight: 4,
        timestamp: genBlockTimestamp(4.5).rewindDate,
        blockHash: 'hash4',
        parentHash: 'hash3',
      });

      const tx = await sequelize1.transaction();
      const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
      await tx.commit();
      expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);
      expect(remaining).toBe(1);
      expect(multiChainRewindService1.waitRewindHeader).toBeUndefined();
    });
  });

  describe('getHeaderByBinarySearch', () => {
    beforeEach(async () => {
      (multiChainRewindService1 as any).startHeight = 20;
      await storeService1.modelProvider.metadata.set('lastProcessedHeight', 10000);
    });

    it('Within the already processed interval', async () => {
      const {rewindDate} = genBlockTimestamp(23);
      const header = await (multiChainRewindService1 as any).getHeaderByBinarySearch(rewindDate);

      expect(header).toEqual({
        blockHeight: 23,
        timestamp: rewindDate,
        blockHash: 'hash23',
        parentHash: 'hash22',
      });
    });

    it('Not within the already processed interval', async () => {
      const {rewindDate: rewindDate19} = genBlockTimestamp(19);
      const {rewindDate: rewindDate20} = genBlockTimestamp(20);
      const header = await (multiChainRewindService1 as any).getHeaderByBinarySearch(rewindDate19);
      expect(header).toEqual({
        blockHeight: 20,
        timestamp: rewindDate20,
        blockHash: 'hash20',
        parentHash: 'hash19',
      });

      const {rewindDate: rewindDate10001} = genBlockTimestamp(10001);
      const {rewindDate: rewindDate10000} = genBlockTimestamp(10000);
      const header10001 = await (multiChainRewindService1 as any).getHeaderByBinarySearch(rewindDate10001);
      expect(header10001).toEqual({
        blockHeight: 10000,
        timestamp: rewindDate10000,
        blockHash: 'hash10000',
        parentHash: 'hash9999',
      });
    });
  });

  describe('Project initialization', () => {
    const reindex = jest.fn();
    let multiChainRewindService: MultiChainRewindService;

    beforeEach(async () => {
      const nodeConfig = new NodeConfig({
        subquery: 'test',
        dbSchema: testSchemaName,
        proofOfIndex: true,
        enableCache: false,
        multiChain: true,
      });
      const project = {network: {chainId: chainId1}, schema} as any;
      const dbModel = new PlainStoreModelService(sequelize, nodeConfig);
      const storeService = new StoreService(sequelize, nodeConfig, dbModel, project);
      await storeService.initCoreTables(testSchemaName);
      const tx = await sequelize.transaction();
      await storeService.init(testSchemaName, tx);
      await tx.commit();

      multiChainRewindService = new MultiChainRewindService(
        nodeConfig,
        sequelize,
        storeService,
        mockBlockchainService as any
      );
    });
    afterEach(async () => {
      await multiChainRewindService.onApplicationShutdown();
      jest.clearAllMocks();
    });

    it('Normal startup, starting will not trigger a reindex.', async () => {
      // Initialize the service
      await multiChainRewindService.init(chainId1, reindex);

      expect(reindex).toHaveBeenCalledTimes(0);
    });

    it('After another chain undergoes a rewind, the current chain starts, which can trigger a reindex.', async () => {
      const {rewindDate} = genBlockTimestamp(5);
      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);

      // Initialize the service
      await multiChainRewindService.init(chainId1, reindex);

      expect(reindex).toHaveBeenCalledTimes(1);
      expect(multiChainRewindService.status).toBe(MultiChainRewindStatus.Incomplete);
      expect(multiChainRewindService.waitRewindHeader).toEqual({
        blockHeight: 5,
        timestamp: rewindDate,
        blockHash: 'hash5',
        parentHash: 'hash4',
      });
    });

    it('The current chain has already completed the rewind, and there are still other chains that need to rewind. In this case, starting will not trigger a reindex.', async () => {
      const {rewindDate} = genBlockTimestamp(5);
      await multiChainRewindService1.acquireGlobalRewindLock(rewindDate);
      const tx = await sequelize1.transaction();
      await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
      await tx.commit();

      // Initialize the service
      await multiChainRewindService.init(chainId1, reindex);

      expect(multiChainRewindService.status).toBe(MultiChainRewindStatus.Complete);
      expect(reindex).toHaveBeenCalledTimes(0);
    });
  });
});
