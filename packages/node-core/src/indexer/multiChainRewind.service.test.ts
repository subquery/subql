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

describe('Check whether the db store and cache store are consistent.', () => {
  let sequelize: Sequelize;
  let storeService: StoreService;
  let multiChainRewindService: MultiChainRewindService;
  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    await sequelize.query(`CREATE SCHEMA ${testSchemaName};`);
    const nodeConfig = new NodeConfig({subquery: 'test', proofOfIndex: true, enableCache: false, multiChain: true});
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
    await multiChainRewindService.init(chainId, testSchemaName, reindex);
  });

  afterEach(async () => {
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    multiChainRewindService.onApplicationShutdown();
    await sequelize.close();
  });

  // Mock IBlockchainService
  const mockBlockchainService = {
    getHeaderForHeight: jest.fn((height: number) => ({
      blockHeight: height,
      timestamp: genBlockDate(height),
      blockHash: `hash${height}`,
      parentHash: height > 0 ? `hash${height - 1}` : '',
    })),
  };

  it('should handle rewind correctly', async () => {
    // Act: Set global rewind lock to rewind to block 5
    const rewindTimestamp = genBlockTimestamp(5);
    await multiChainRewindService.setGlobalRewindLock(rewindTimestamp);

    // Wait briefly for the PostgreSQL listener to process the notification
    await delay(1);

    // Assert: Check that the service is in Rewinding state and has the correct waitRewindHeader
    expect(multiChainRewindService.status).toBe(RewindStatus.Rewinding);
    expect(multiChainRewindService.waitRewindHeader).toEqual({
      blockHeight: 5,
      timestamp: new Date(rewindTimestamp),
      blockHash: 'hash5',
      parentHash: 'hash4',
    });

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
});
