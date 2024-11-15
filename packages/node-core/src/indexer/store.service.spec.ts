// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {gql} from '@apollo/client';
import {buildSchemaFromString, Json} from '@subql/utils';
import {Sequelize, DataTypes, Model, ModelAttributes, QueryTypes} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {addIdAndBlockRangeAttributes, DbOption} from '../db';
import {BaseProjectService} from './project.service';
import {StoreService} from './store.service';
import {PlainStoreModelService} from './storeModelProvider';
import {PlainModel} from './storeModelProvider/model/model';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(60000);
describe('Store Service', () => {
  let storeService: StoreService;

  it('addIdAndBlockRangeAttributes', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    const attributes = {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
    } as ModelAttributes<Model<any, any>, any>;
    addIdAndBlockRangeAttributes(attributes);
    expect(Object.keys(attributes).length).toEqual(3);
    expect((attributes.id as any).primaryKey).toEqual(false);
    expect(attributes.__id).toEqual({
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    });
    expect(attributes.__block_range).toEqual({
      type: DataTypes.RANGE(DataTypes.BIGINT),
      allowNull: false,
    });
  });

  it('could find indexed field', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any).__modelIndexedFields = [
      {
        entityName: 'MinerIP', // This is a special case that upperFirst and camelCase will fail
        fieldName: 'net_uid',
        isUnique: false,
        type: 'btree',
      },
      {
        entityName: 'MinerColdkey',
        fieldName: 'net_uid',
        isUnique: false,
        type: 'btree',
      },
    ];
    expect(() => storeService.isIndexed('MinerIP', 'netUid')).toBeTruthy();
  });

  it('isIndexed support snake case', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any)._modelIndexedFields = [
      {
        entityName: 'Transfer',
        fieldName: 'account_from_id',
        isUnique: false,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'account_to_id',
        isUnique: false,
        type: 'btree',
      },
    ];

    expect(storeService.isIndexed('Transfer', 'account_fromId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToId2')).toEqual(false);
    expect(storeService.isIndexed('Transfer2', 'accountToId')).toEqual(false);

    expect(storeService.isIndexed('Transfer', 'AccountToId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToID')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountTo_ID')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountTo_Id')).toEqual(true);
  });

  it('isIndexedHistorical support snake case', () => {
    storeService = new StoreService(null as any, null as any, null as any, null as any);
    (storeService as any)._historical = false;
    (storeService as any)._modelIndexedFields = [
      {
        entityName: 'Transfer',
        fieldName: 'account_from_id',
        isUnique: true,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'account_to_id',
        isUnique: true,
        type: 'btree',
      },
      {
        entityName: 'Transfer',
        fieldName: 'not_index_id',
        isUnique: false,
        type: 'btree',
      },
    ];

    expect(storeService.isIndexedHistorical('Transfer', 'account_fromId')).toEqual(true);
    expect(storeService.isIndexedHistorical('Transfer', 'accountToId')).toEqual(true);

    expect(storeService.isIndexedHistorical('Transfer', 'accountToId2')).toEqual(false);
    expect(storeService.isIndexedHistorical('Transfer2', 'accountToId')).toEqual(false);

    expect(storeService.isIndexedHistorical('Transfer', 'not_index_id')).toEqual(false);

    expect(storeService.isIndexedHistorical('Transfer', 'not_index_id')).toEqual(false);

    expect(storeService.isIndexed('Transfer', 'AccountToId')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountToID')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountTo_ID')).toEqual(true);
    expect(storeService.isIndexed('Transfer', 'accountTo_Id')).toEqual(true);
  });
});

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
