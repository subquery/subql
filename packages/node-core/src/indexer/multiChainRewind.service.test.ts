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
  await storeService.init(testSchemaName);
  await storeService.modelProvider.metadata.set('chain', chainId);
  await storeService.modelProvider.metadata.set('startHeight', 1);
  await storeService.modelProvider.metadata.set('lastProcessedHeight', 10000);
  await storeService.modelProvider.metadata.set(
    'lastProcessedBlockTimestamp',
    genBlockTimestamp(10000).rewindTimestamp
  );

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
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    multiChainRewindService1.onApplicationShutdown();
    multiChainRewindService2.onApplicationShutdown();
    await sequelize.close();
  });

  it('A chain rollback has been completed.', async () => {
    const {rewindDate} = genBlockTimestamp(5);
    await multiChainRewindService1.setGlobalRewindLock(rewindDate);

    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Rewinding);
    expect(multiChainRewindService1.waitRewindHeader).toBeUndefined();
    await delay(1);

    const tx = await sequelize1.transaction();
    const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
    await tx.commit();

    expect(remaining).toBe(1);
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);

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

    await multiChainRewindService1.setGlobalRewindLock(rewindDate1);
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Rewinding);

    await multiChainRewindService2.setGlobalRewindLock(rewindDate2);
    expect(multiChainRewindService2.status).toBe(MultiChainRewindStatus.Rewinding);

    const res = await sequelize.query<{rewindTimestamp: Date}>(
      `SELECT "chainId","rewindTimestamp" FROM "${testSchemaName}"."_global";`,
      {type: QueryTypes.SELECT}
    );

    // The rewindTimestamp of the later chain will overwrite that of the earlier chain.
    expect(res).toEqual([
      {chainId: chainId1, rewindTimestamp: rewindDate2},
      {chainId: chainId2, rewindTimestamp: rewindDate2},
    ]);

    // Rollback to rewindDate1 is not allowed because it has already been overwritten.
    let tx = await sequelize1.transaction();
    let remaining = 2;
    await expect(multiChainRewindService1.releaseChainRewindLock(tx, rewindDate1)).rejects.toThrow();
    await tx.rollback();

    // Rollback to rewindDate2 is allowed.
    tx = await sequelize1.transaction();
    remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate2);
    await tx.commit();

    // Only one chain has been rolled back.
    expect(remaining).toBe(1);
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);

    // Chain2 has started rolling back.
    tx = await sequelize2.transaction();
    remaining = await multiChainRewindService2.releaseChainRewindLock(tx, rewindDate2);
    await tx.commit();

    await delay(1);
    // The last chain rollback is complete, all chains have finished rolling back.
    expect(remaining).toBe(0);
    expect(multiChainRewindService2.status).toBe(MultiChainRewindStatus.Normal);
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
    await multiChainRewindService1.setGlobalRewindLock(rewindDate);

    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Rewinding);

    const tx = await sequelize1.transaction();
    const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate);
    await tx.commit();

    await delay(1);

    expect(mockGetHeaderByBinarySearch).toHaveBeenCalledWith(expect.any(Date));
    expect(remaining).toBe(1);
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);
  });

  it('If it rewind to a future time, force release lock test', async () => {
    const {rewindDate: lastProcessTx} = genBlockTimestamp(100);
    const {rewindDate: rewindDate100000} = genBlockTimestamp(100000);
    await multiChainRewindService1.setGlobalRewindLock(rewindDate100000);

    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Rewinding);
    expect(multiChainRewindService1.waitRewindHeader).toBeUndefined();
    await delay(1);

    const tx = await sequelize1.transaction();
    const remaining = await multiChainRewindService1.releaseChainRewindLock(tx, rewindDate100000, lastProcessTx);
    await tx.commit();

    expect(remaining).toBe(1);
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Complete);
  });

  it('Forced lock release height < lastProcessHeight, release fails', async () => {
    const {rewindDate: lastProcessTx} = genBlockTimestamp(100);
    const {rewindDate: rewindDate99} = genBlockTimestamp(99);
    await multiChainRewindService1.setGlobalRewindLock(rewindDate99);

    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Rewinding);
    expect(multiChainRewindService1.waitRewindHeader).toBeUndefined();
    await delay(1);

    const tx = await sequelize1.transaction();
    await expect(multiChainRewindService1.releaseChainRewindLock(tx, rewindDate99, lastProcessTx)).rejects.toThrow();
    await tx.rollback();

    // notifyHandle will update the status to Incomplete
    expect(multiChainRewindService1.status).toBe(MultiChainRewindStatus.Incomplete);
  });
});
