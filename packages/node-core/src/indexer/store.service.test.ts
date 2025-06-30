// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {buildSchemaFromString} from '@subql/utils';
import {Sequelize, QueryTypes} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {DbOption} from '../db';
import {StoreService} from './store.service';
import {CachedModel, PlainStoreModelService, StoreCacheService} from './storeModelProvider';
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

const testSchemaName = 'test_model_store';
const schema = buildSchemaFromString(`
  type Account @entity {
    id: ID! # Account address
    balance: Int
  }
`);

describe('Check whether the db store and cache store are consistent.', () => {
  let sequelize: Sequelize;
  let storeService: StoreService;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    await sequelize.query(`CREATE SCHEMA ${testSchemaName};`);
    const nodeConfig = new NodeConfig({subquery: 'test', proofOfIndex: true, enableCache: false});
    const project = {network: {chainId: '1'}, schema} as any;
    const dbModel = new PlainStoreModelService(sequelize, nodeConfig);
    storeService = new StoreService(sequelize, nodeConfig, dbModel, project);
    await storeService.initCoreTables(testSchemaName);
    const tx = await sequelize.transaction();
    await storeService.init(testSchemaName, tx);
    await tx.commit();
  });
  afterAll(async () => {
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    await sequelize.close();
  });

  afterEach(async () => {
    if (storeService.transaction) {
      await storeService.modelProvider.applyPendingChanges(1, false, storeService.transaction);
    }
  });

  it('Same block, Execute the set method multiple times.', async () => {
    await storeService.setBlockHeader({
      blockHeight: 1,
      blockHash: '0x01',
      parentHash: '0x00',
      timestamp: genBlockDate(1),
    });

    const accountEntity = {id: 'block-001', balance: 100};

    // account not exist.
    let account = await storeService.getStore().get('Account', accountEntity.id);
    expect(account).toBeUndefined();

    // insert account success.
    await storeService.getStore().set('Account', accountEntity.id, accountEntity as any);
    account = await storeService.getStore().get('Account', accountEntity.id);
    expect(account).toEqual(accountEntity);

    // block range check.
    const [dbData] = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts" WHERE id = :id`, {
      replacements: {id: accountEntity.id},
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(dbData._block_range).toEqual([
      {value: '1', inclusive: true},
      {value: null, inclusive: false},
    ]);

    // update account success.
    const account001 = {id: 'block-001', balance: 10000};
    await storeService.getStore().set('Account', account001.id, account001 as any);
    const account001After = await storeService.getStore().get('Account', account001.id);
    expect(account001After).toEqual(account001);
    console.log({accountAfter: account001After, accountEntityAfter: account001});

    // only one record in db and block range check.
    const allDatas = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(allDatas).toHaveLength(1);
    expect(allDatas[0]._block_range).toEqual([
      {value: '1', inclusive: true},
      {value: null, inclusive: false},
    ]);

    const account002 = {id: 'block-002', balance: 100};
    await storeService.getStore().bulkCreate('Account', [account002, account001]);
    const account002After = await storeService.getStore().get('Account', account002.id);
    expect(account002After).toEqual(account002);

    // two records in db and block range check.
    const allDatas2 = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(allDatas2).toHaveLength(2);
    expect(allDatas2[0]._block_range).toEqual([
      {value: '1', inclusive: true},
      {value: null, inclusive: false},
    ]);
    expect(allDatas2[1]._block_range).toEqual([
      {value: '1', inclusive: true},
      {value: null, inclusive: false},
    ]);
  }, 30000);

  it('_block_range update check', async () => {
    await storeService.setBlockHeader({
      blockHeight: 1000,
      blockHash: '0x1000',
      parentHash: '0x0999',
      timestamp: genBlockDate(1000),
    });

    // insert new account.
    const account1000Data = {id: 'block-1000', balance: 999};
    await storeService.getStore().set('Account', account1000Data.id, account1000Data as any);
    const account1000 = await storeService.getStore().get('Account', account1000Data.id);
    expect(account1000).toEqual(account1000Data);

    const allDatas = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(allDatas).toHaveLength(3);

    // set old account.
    const account002 = {id: 'block-002', balance: 222222};
    await storeService.getStore().set('Account', account002.id, account002 as any);
    const account002After = await storeService.getStore().get('Account', account002.id);
    expect(account002After).toEqual(account002);
    expect((account002After as any).balance).toEqual(222222);

    const allDatas2 = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(allDatas2).toHaveLength(4);

    // check block range.
    const account002Datas = allDatas2.filter((v) => v.id === account002.id);
    expect(account002Datas).toHaveLength(2);
    expect(account002Datas.map((v) => v._block_range).sort((a, b) => b[0].value - a[0].value)).toEqual([
      [
        {value: '1000', inclusive: true},
        {value: null, inclusive: false},
      ],
      [
        {value: '1', inclusive: true},
        {value: '1000', inclusive: false},
      ],
    ]);
  }, 100000);
});

describe('Cache Provider', () => {
  let sequelize: Sequelize;
  let storeService: StoreService;
  let cacheModel: StoreCacheService;
  let Account: CachedModel<any>;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    await sequelize.query(`CREATE SCHEMA ${testSchemaName};`);
    const nodeConfig = new NodeConfig({
      subquery: 'test',
      proofOfIndex: true,
      enableCache: false,
      storeCacheAsync: true,
      storeCacheThreshold: 1,
      storeCacheUpperLimit: 1,
      storeFlushInterval: 0,
    });
    const project = {network: {chainId: '1'}, schema} as any;
    cacheModel = new StoreCacheService(sequelize, nodeConfig, new EventEmitter2());
    storeService = new StoreService(sequelize, nodeConfig, cacheModel, project);
    await storeService.initCoreTables(testSchemaName);
    const tx = await sequelize.transaction();
    await storeService.init(testSchemaName, tx);
    await tx.commit();
    Account = cacheModel.getModel('Account') as CachedModel<any>;
  });
  afterAll(async () => {
    await sequelize.query(`DROP SCHEMA ${testSchemaName} CASCADE;`);
    await sequelize.close();
  });

  beforeEach(async () => {
    await sequelize.query(`TRUNCATE TABLE "${testSchemaName}"."accounts" CASCADE;`);
  });
  async function cacheFlush(blockHeight: number, handle: (blockHeight: number) => Promise<void>) {
    const tx = await sequelize.transaction();
    tx.afterCommit(() => {
      Account.clear(blockHeight);
    });
    await storeService.setBlockHeader({
      blockHeight,
      blockHash: `0x${blockHeight}`,
      parentHash: `0x${blockHeight - 1}`,
      timestamp: genBlockDate(blockHeight),
    });
    await handle(blockHeight);
    await Account.runFlush(tx, blockHeight);
    await tx.commit();
  }

  it('For data that already exists, if there is a delete-create-delete operation, the database should have two entries for the data.', async () => {
    const getAllAccounts = () =>
      sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
        type: QueryTypes.SELECT,
      });

    const accountEntity1 = {id: 'accountEntity-001', balance: 100};
    await cacheFlush(1, async (blockHeight) => {
      await Account.set(accountEntity1.id, accountEntity1, blockHeight);
    });

    // database check
    let allDatas = await getAllAccounts();
    expect(allDatas).toHaveLength(1);

    // next block 999
    const accountEntity2 = {id: 'accountEntity-002', balance: 9999};
    await cacheFlush(999, async (blockHeight) => {
      await Account.remove(accountEntity1.id, blockHeight);
      const oldAccunt = await Account.get(accountEntity1.id);
      expect(oldAccunt).toBeUndefined();

      await Account.set(accountEntity2.id, accountEntity2, blockHeight);
    });

    allDatas = await getAllAccounts();
    expect(allDatas).toHaveLength(2);

    // next block 99999
    await cacheFlush(99999, async (blockHeight) => {
      // last block, accountEntity1 should be deleted.
      const oldAccunt1 = await Account.get(accountEntity1.id);
      expect(oldAccunt1).toBeUndefined();

      let oldAccunt2 = await Account.get(accountEntity2.id);
      expect(oldAccunt2.balance).toEqual(accountEntity2.balance);

      await Account.remove(accountEntity2.id, blockHeight);
      oldAccunt2 = await Account.get(accountEntity2.id);
      expect(oldAccunt2).toBeUndefined();

      await Account.set(accountEntity2.id, {id: 'accountEntity-002', balance: 999999} as any, blockHeight);
      oldAccunt2 = await Account.get(accountEntity2.id);
      expect(oldAccunt2.balance).toEqual(999999);
    });

    allDatas = await getAllAccounts();
    expect(allDatas).toHaveLength(3);
  });

  it('Should correctly rewind to previous states', async () => {
    const getAllAccounts = () =>
      sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
        type: QueryTypes.SELECT,
      });

    // Set up initial data at block 5000
    const accountEntity = {id: 'rewind-test-001', balance: 1000};
    await cacheFlush(5000, async (blockHeight) => {
      await Account.set(accountEntity.id, accountEntity, blockHeight);
    });

    // Modify data at block 6000
    const updatedAccount = {id: 'rewind-test-001', balance: 2000};
    await cacheFlush(6000, async (blockHeight) => {
      await Account.set(updatedAccount.id, updatedAccount, blockHeight);
    });

    // Add new data at block 7000
    const anotherAccount = {id: 'rewind-test-002', balance: 3000};
    await cacheFlush(7000, async (blockHeight) => {
      await Account.set(anotherAccount.id, anotherAccount, blockHeight);
    });

    // Verify current state before rewind
    const account1 = await Account.get(accountEntity.id);
    const account2 = await Account.get(anotherAccount.id);
    expect(account1.balance).toEqual(2000);
    expect(account2.balance).toEqual(3000);

    // Rewind to block 6000
    const tx1 = await sequelize.transaction();
    await storeService.rewind({blockHeight: 6000, timestamp: new Date()} as any, tx1);
    await tx1.commit();

    let allDatas = await getAllAccounts();
    expect(allDatas.length).toEqual(2);

    // Rewind further back to block 5000
    const tx2 = await sequelize.transaction();
    await storeService.rewind({blockHeight: 5000, timestamp: new Date()} as any, tx2);
    await tx2.commit();

    allDatas = await getAllAccounts();
    expect(allDatas.length).toEqual(1);

    // Check database records
    allDatas = await getAllAccounts();
    const rewindTestDatas = allDatas.filter((data) => data.id.startsWith('rewind-test'));

    // We should only have one active record for rewind-test-001 with block range starting at 5000
    const activeRecords = rewindTestDatas.filter((data) => data._block_range[1].value === null);

    expect(activeRecords.length).toEqual(1);
    expect(activeRecords[0].id).toEqual('rewind-test-001');
    expect(activeRecords[0].balance).toEqual(1000);
    expect(activeRecords[0]._block_range[0].value).toEqual('5000');
  });
});
