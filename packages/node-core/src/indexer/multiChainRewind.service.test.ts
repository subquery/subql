// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {buildSchemaFromString} from '@subql/utils';
import {Sequelize, QueryTypes} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {DbOption} from '../db';
import {delay} from '../utils';
import {MultiChainRewindService, RewindStatus} from './multiChainRewind.service';
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
const genBlockTimestamp = (height: number) => (1740100000 + height) * 1000;
const genBlockDate = (height: number) => new Date(genBlockTimestamp(height));

const testSchemaName = 'test_multi_chain_rewind';
const schema = buildSchemaFromString(`
  type Account @entity {
    id: ID! # Account address
    balance: Int
  }
`);

describe('MultiChain Rewind Service', () => {
  let sequelize: Sequelize;
  let storeService: StoreService;
  let multiChainRewindService: MultiChainRewindService;

  // Mock IBlockchainService
  const mockBlockchainService = {
    getHeaderForHeight: jest.fn((height: number) => ({
      blockHeight: height,
      timestamp: genBlockDate(height),
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
    const nodeConfig = new NodeConfig({
      subquery: 'test',
      dbSchema: testSchemaName,
      proofOfIndex: true,
      enableCache: false,
      multiChain: true,
    });
    const project = {network: {chainId: '1'}, schema} as any;
    const dbModel = new PlainStoreModelService(sequelize, nodeConfig);
    storeService = new StoreService(sequelize, nodeConfig, dbModel, project);
    await storeService.initCoreTables(testSchemaName);
    await storeService.init(testSchemaName);
    await storeService.modelProvider.metadata.set('startHeight', 1);
    await storeService.modelProvider.metadata.set('lastProcessedHeight', 10000);
    await storeService.modelProvider.metadata.set('lastProcessedBlockTimestamp', genBlockTimestamp(10000));

    const chainId = '1';
    const eventEmitter = new EventEmitter2();
    multiChainRewindService = new MultiChainRewindService(
      nodeConfig,
      eventEmitter,
      sequelize,
      storeService,
      mockBlockchainService as any
    );

    const reindex = jest.fn();

    // Initialize the service
    await multiChainRewindService.init(chainId, reindex);
  });

  afterEach(async () => {
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    multiChainRewindService.onApplicationShutdown();
    await sequelize.close();
  });

  it('should handle rewind correctly', async () => {
    // Act: Set global rewind lock to rewind to block 5
    const rewindTimestamp = genBlockTimestamp(5);
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp);

    // Assert: Check that the service is in Rewinding state and has the correct waitRewindHeader
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);
    expect(multiChainRewindService.waitRewindHeader).toBeUndefined();

    // Release the chain rewind lock
    const tx = await sequelize.transaction();
    const remaining = await multiChainRewindService.releaseChainRewindLock(tx, rewindTimestamp);
    await tx.commit();

    // Wait for the RewindComplete notification to be processed
    await delay(1);

    // Assert: Check that the rewind is complete and status is back to Normal
    expect(remaining).toBe(0); // No remaining chains to rewind
    expect(multiChainRewindService.status).toBe(RewindStatus.Normal);
    expect(multiChainRewindService.waitRewindHeader).toBeUndefined();
  });

  it('should handle multiple concurrent rewind requests', async () => {
    // Arrange: Set up multiple rewind timestamps
    const rewindTimestamp1 = genBlockTimestamp(5);
    const rewindTimestamp2 = genBlockTimestamp(3); // Earlier timestamp

    // Act: Request two rewinds almost simultaneously
    const promise1 = multiChainRewindService.setGlobalRewindLock(rewindTimestamp1);
    const promise2 = multiChainRewindService.setGlobalRewindLock(rewindTimestamp2);

    await Promise.all([promise1, promise2]);

    // Assert: The service should be in Rewinding state
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);

    // Complete the rewind process
    const tx = await sequelize.transaction();
    const remaining = await multiChainRewindService.releaseChainRewindLock(tx, rewindTimestamp2);
    await tx.commit();

    await delay(1);

    // Assert: The rewind is complete and used the earlier timestamp
    expect(remaining).toBe(0);
    expect(multiChainRewindService.status).toBe(RewindStatus.Normal);
  });

  it('should handle rewind to a timestamp that already passed', async () => {
    // Mock the current timestamp to be higher than our target
    jest.spyOn(multiChainRewindService, 'searchWaitRewindHeader' as any).mockResolvedValueOnce({
      blockHeight: 2,
      timestamp: genBlockDate(2),
      blockHash: 'hash2',
      parentHash: 'hash1',
    });

    // Act: Set rewind to timestamp 2 (which is "in the past" for the current chain state)
    const rewindTimestamp = genBlockTimestamp(2);
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp);

    // Assert: The service should still enter Rewinding state
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);

    // Complete the rewind process
    const tx = await sequelize.transaction();
    const remaining = await multiChainRewindService.releaseChainRewindLock(tx, rewindTimestamp);
    await tx.commit();

    await delay(1);

    expect(remaining).toBe(0);
    expect(multiChainRewindService.status).toBe(RewindStatus.Normal);
  });

  it('should handle rewind during an ongoing rewind', async () => {
    // Act: Set first rewind to block 5
    const rewindTimestamp1 = genBlockTimestamp(5);
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp1);

    // Assert: Check that the service is in Rewinding state
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);

    // Act: Attempt to rewind to an earlier block while already rewinding
    const rewindTimestamp2 = genBlockTimestamp(3);
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp2);

    // Complete the rewind process
    const tx = await sequelize.transaction();
    // We should be rewinding to timestamp2 since it's earlier
    const remaining = await multiChainRewindService.releaseChainRewindLock(tx, rewindTimestamp2);
    await tx.commit();

    await delay(1);

    expect(remaining).toBe(0);
    expect(multiChainRewindService.status).toBe(RewindStatus.Normal);
  });

  it('should handle binary search edge cases for timestamp matching', async () => {
    // Mock the binary search to simulate a large gap between blocks
    const mockGetHeaderByBinarySearch = jest.spyOn(multiChainRewindService as any, 'getHeaderByBinarySearch');
    mockGetHeaderByBinarySearch.mockResolvedValueOnce({
      blockHeight: 4,
      timestamp: genBlockDate(4),
      blockHash: 'hash4',
      parentHash: 'hash3',
    });

    // Act: Set rewind to a timestamp that falls between blocks
    const rewindTimestamp = genBlockTimestamp(4.5); // Timestamp between blocks 4 and 5
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp);

    // Assert: The service should use the closest block
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);

    // Complete the rewind process
    const tx = await sequelize.transaction();
    const remaining = await multiChainRewindService.releaseChainRewindLock(tx, rewindTimestamp);
    await tx.commit();

    await delay(1);

    expect(mockGetHeaderByBinarySearch).toHaveBeenCalledWith(expect.any(Date));
    expect(remaining).toBe(0);
    expect(multiChainRewindService.status).toBe(RewindStatus.Normal);
  });
});
