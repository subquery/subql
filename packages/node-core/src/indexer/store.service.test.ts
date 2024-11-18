// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {buildSchemaFromString} from '@subql/utils';
import {Sequelize, QueryTypes} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {DbOption} from '../db';
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
const testSchemaName = 'test_model_store';
const schema = buildSchemaFromString(`
  type Account @entity {
    id: ID! # Account address
    balance: BigInt
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
    await storeService.init(testSchemaName);
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
    await storeService.setBlockHeight(1);

    const accountEntity = {id: 'block-001', balance: '100'};

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
    const account001 = {id: 'block-001', balance: '10000'};
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

    const account002 = {id: 'block-002', balance: '100'};
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
    await storeService.setBlockHeight(1000);

    // insert new account.
    const account1000Data = {id: 'block-1000', balance: '999'};
    await storeService.getStore().set('Account', account1000Data.id, account1000Data as any);
    const account1000 = await storeService.getStore().get('Account', account1000Data.id);
    expect(account1000).toEqual(account1000Data);

    const allDatas = await sequelize.query<any>(`SELECT * FROM "${testSchemaName}"."accounts"`, {
      type: QueryTypes.SELECT,
      transaction: storeService.transaction,
    });
    expect(allDatas).toHaveLength(3);

    // set old account.
    const account002 = {id: 'block-002', balance: '222222'};
    await storeService.getStore().set('Account', account002.id, account002 as any);
    const account002After = await storeService.getStore().get('Account', account002.id);
    expect(account002After).toEqual(account002);
    expect((account002After as any).balance).toEqual('222222');

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
  }, 10000);
});
