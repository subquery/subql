// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {CachedModel, DbOption, handledStringify, modelsTypeToModelAttributes, NodeConfig} from '@subql/node-core';
import {Entity, FunctionPropertyNames, Store} from '@subql/types-core';
import {Boolean, GraphQLModelsType, Int, u8aToHex} from '@subql/utils';
import {Sequelize} from '@subql/x-sequelize';
import {EntityClass} from './store/entity';
import {StoreOperations} from './StoreOperations';
import {OperationType} from './types';

interface TestJson {
  testItem: string;
  amount?: bigint;
}

interface DelegationFrom {
  delegator: string;
  amount?: bigint;
  nested?: TestJson;
}

type EraProps = Omit<EraEntity, NonNullable<FunctionPropertyNames<EraEntity>> | '_name'>;

class EraEntity implements Entity {
  constructor(id: string, startTime: Date) {
    this.id = id;
    this.startTime = startTime;
  }

  id: string;
  startTime: Date;
  endTime?: Date;
  forceNext?: boolean;
  createdBlock?: number;
  lastEvent?: string;
  delegators?: DelegationFrom[];

  static create(record: EraProps): EraEntity {
    assert(typeof record.id === 'string', 'id must be provided');
    const entity = new this(record.id, record.startTime);
    Object.assign(entity, record);
    return entity;
  }
}

const models: GraphQLModelsType[] = [
  {
    name: 'EraEntity',
    fields: [
      {
        name: 'id',
        type: 'ID',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: 'startTime',
        type: 'Date',
        isArray: false,
        nullable: false,
        isEnum: false,
      },
      {
        name: 'endTime',
        type: 'Date',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'forceNext',
        type: 'Boolean',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'createdBlock',
        type: 'Int',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'lastEvent',
        type: 'String',
        isArray: false,
        nullable: true,
        isEnum: false,
      },
      {
        name: 'delegators',
        type: 'Json',
        nullable: true,
        jsonInterface: {
          name: 'DelegationFrom',
          fields: [
            {name: 'delegator', type: 'String', isArray: false, nullable: false},
            {name: 'amount', type: 'BigInt', isArray: false, nullable: true},
            {
              name: 'nested',
              type: 'Json',
              isArray: false,
              nullable: false,
              jsonInterface: {
                name: 'TestJson',
                fields: [
                  {name: 'testItem', type: 'String', isArray: false, nullable: false},
                  {name: 'amount', type: 'BigInt', isArray: false, nullable: true},
                ],
              },
            },
          ],
        },
        isEnum: false,
        isArray: true,
      },
    ],
    indexes: <any[]>[],
  },
];

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(50_000);

describe('StoreOperations with db', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;
  let cacheModel: CachedModel<EraEntity>;

  const flush = async (blockHeight: number) => {
    const tx = await sequelize.transaction();
    await cacheModel.flush(tx, blockHeight);
    await tx.commit();
  };

  beforeAll(async () => {
    process.env.TZ = 'UTC';
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    schema = '"storeOp-test-1"';
    await sequelize.createSchema(schema, {});

    const modelAttributes = modelsTypeToModelAttributes(models[0], new Map(), schema);

    const modelFactory = sequelize.define('eraEntity', modelAttributes, {timestamps: false, schema: schema});
    model = await modelFactory.sync().catch((e) => {
      console.log('error', e);
      throw e;
    });

    let i = 0;

    cacheModel = new CachedModel(model, false, new NodeConfig({} as any), () => i++);
  });

  afterAll(async () => {
    await sequelize.dropSchema(schema, {logging: false});
    await sequelize.close();
  });

  // If this test failed, please check environment variables TZ is set to UTC
  it('Timestamp, check operation stack consistency with data fetched from db and cache', async () => {
    const operationStackDb = new StoreOperations(models);
    const operationStackCache = new StoreOperations(models);

    cacheModel.set(
      `0x01`,
      {
        id: `0x01`,
        startTime: new Date('2024-02-14T02:38:51.000Z'),
        forceNext: false,
        createdBlock: 10544492,
      },
      1
    );
    await flush(2);

    const rawDb = (await cacheModel.model.findOne({where: {id: '0x01'}}))?.toJSON();

    const rawCache = await (cacheModel as any).getCache.get('0x01');

    const entityDb = EntityClass.create<EraEntity>('EraEntity', rawDb, {} as Store);
    expect(entityDb).toBeDefined();
    if (entityDb) {
      // Mock set end time
      entityDb.endTime = new Date('2024-02-24T02:38:51.000Z');
      console.log(`db data: ${handledStringify(entityDb)}`);
      operationStackDb.put(OperationType.Set, 'EraEntity', entityDb);
    }

    const entityCache = EntityClass.create<EraEntity>('EraEntity', rawCache, {} as Store);
    expect(entityCache).toBeDefined();
    if (entityCache) {
      // Mock set end time
      entityCache.endTime = new Date('2024-02-24T02:38:51.000Z');
      console.log(`cache data: ${handledStringify(entityCache)}`);
      operationStackCache.put(OperationType.Set, 'EraEntity', entityCache);
    }

    operationStackDb.makeOperationMerkleTree();
    expect(operationStackDb.getOperationLeafCount()).toBe(1);
    const mRootDb = operationStackDb.getOperationMerkleRoot();

    operationStackCache.makeOperationMerkleTree();
    expect(operationStackCache.getOperationLeafCount()).toBe(1);
    const mRootCache = operationStackCache.getOperationMerkleRoot();

    expect(entityCache?.delegators).toBeUndefined();
    expect(entityDb?.delegators).toBe(null);

    console.log(`Db mmr Root in hex: ${u8aToHex(mRootDb)}`);

    console.log(`Cache mmr Root in hex: ${u8aToHex(mRootCache)}`);

    expect(mRootDb).toEqual(mRootCache);
  });

  it('JSONB array, check operation stack consistency with data fetched from db and cache', async () => {
    const operationStackDb = new StoreOperations(models);
    const operationStackCache = new StoreOperations(models);

    cacheModel.set(
      `0x03`,
      {
        id: `0x03`,
        startTime: new Date('2024-02-14T02:38:51.000Z'),
        forceNext: false,
        createdBlock: 10544492,
        delegators: [
          {
            delegator: '0x05',
            amount: BigInt(8000000000000000000000n),
            nested: {testItem: 'test', amount: undefined},
          },
          {
            delegator: '0x06',
            amount: undefined,
            nested: {testItem: 'test', amount: BigInt(1000000000000000000000n)},
          },
        ],
      },
      1
    );
    await flush(2);

    const rawDb = (await cacheModel.model.findOne({where: {id: '0x03'}}))?.toJSON();

    const rawCache = await (cacheModel as any).getCache.get('0x03');

    const entityDb = EntityClass.create<EraEntity>('EraEntity', rawDb, {} as Store);
    expect(entityDb).toBeDefined();
    if (entityDb) {
      entityDb.delegators?.push({
        delegator: '0x07',
        amount: undefined,
        nested: {testItem: 'test', amount: BigInt(3000000000000000000000n)},
      });
      console.log(`db data: ${handledStringify(entityDb)}`);
      operationStackDb.put(OperationType.Set, 'EraEntity', entityDb);
    }

    const entityCache = EntityClass.create<EraEntity>('EraEntity', rawCache, {} as Store);
    expect(entityCache).toBeDefined();
    if (entityCache) {
      entityCache.delegators?.push({
        delegator: '0x07',
        amount: undefined,
        nested: {testItem: 'test', amount: BigInt(3000000000000000000000n)},
      });
      console.log(`cache data: ${handledStringify(entityCache)}`);
      operationStackCache.put(OperationType.Set, 'EraEntity', entityCache);
    }

    operationStackDb.makeOperationMerkleTree();
    expect(operationStackDb.getOperationLeafCount()).toBe(1);
    const mRootDb = operationStackDb.getOperationMerkleRoot();

    operationStackCache.makeOperationMerkleTree();
    expect(operationStackCache.getOperationLeafCount()).toBe(1);
    const mRootCache = operationStackCache.getOperationMerkleRoot();

    console.log(`Db mmr Root in hex: ${u8aToHex(mRootDb)}`);

    console.log(`Cache mmr Root in hex: ${u8aToHex(mRootCache)}`);

    expect(mRootDb).toEqual(mRootCache);
  });
});
