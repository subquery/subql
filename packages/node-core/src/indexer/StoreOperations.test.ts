// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {CachedModel, DbOption, handledStringify, NodeConfig} from '@subql/node-core';
import {Entity, FunctionPropertyNames, Store} from '@subql/types-core';
import {Boolean, DateObj, Int, String, u8aToHex} from '@subql/utils';
import {Sequelize} from '@subql/x-sequelize';
import {EntityClass} from './store/entity';
import {StoreOperations} from './StoreOperations';
import {OperationType} from './types';

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

  static create(record: EraProps): EraEntity {
    assert(typeof record.id === 'string', 'id must be provided');
    const entity = new this(record.id, record.startTime);
    Object.assign(entity, record);
    return entity;
  }
}

const models = [
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

jest.setTimeout(10_000);

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

    const modelFactory = sequelize.define(
      'eraEntity',
      {
        id: {
          type: String.sequelizeType,
          primaryKey: true,
        },
        startTime: {type: DateObj.sequelizeType},
        endTime: {type: DateObj.sequelizeType, allowNull: true},
        lastEvent: {type: String.sequelizeType, allowNull: true},
        forceNext: {type: Boolean.sequelizeType, allowNull: true},
        createdBlock: {type: Int.sequelizeType, allowNull: true},
      },
      {timestamps: false, schema: schema}
    );
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
  it('check operation stack consistency with data fetched from db and cache', async () => {
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

    console.log(`Db mmr Root in hex: ${u8aToHex(mRootDb)}`);

    console.log(`Cache mmr Root in hex: ${u8aToHex(mRootCache)}`);

    expect(mRootDb).toEqual(mRootCache);
  });
});
