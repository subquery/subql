// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize, DataTypes} from '@subql/x-sequelize';
import {DbOption, NodeConfig} from '../../';
import {CachedModel} from './cacheModel';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(100_000);

describe('cacheMetadata integration', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;
  let cacheModel: CachedModel<{id: string; field1: number}>;

  const flush = async (blockHeight?: number) => {
    const tx = await sequelize.transaction();
    await cacheModel.flush(tx, blockHeight);
    await tx.commit();
  };

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    schema = '"model-test-1"';
    await sequelize.createSchema(schema, {});

    // TODO create model
    const modelFactory = sequelize.define(
      'testModel',
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        field1: DataTypes.INTEGER,
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

  describe('getByFields', () => {
    beforeAll(async () => {
      // Pre-populate some data and flush it do the db
      let n = 0;
      while (n < 100) {
        cacheModel.set(
          `entity1_id_0x${n}`,
          {
            id: `entity1_id_0x${n}`,
            field1: 1,
          },
          1
        );
        n++;
      }

      await flush(2);

      // Add some changes to the cache
      let m = 20;
      while (m < 30) {
        cacheModel.set(
          `entity1_id_0x${m}`,
          {
            id: `entity1_id_0x${m}`,
            field1: m % 2,
          },
          3
        );
        m++;
      }
    });

    it('gets one item correctly', async () => {
      // Db value
      const res0 = await cacheModel.getOneByField('id', 'entity1_id_0x1');
      expect(res0).toEqual({id: 'entity1_id_0x1', field1: 1});

      // Cache value
      const res1 = await cacheModel.getOneByField('id', 'entity1_id_0x20');
      expect(res1).toEqual({id: 'entity1_id_0x20', field1: 0});

      // Cache value
      const res2 = await cacheModel.getOneByField('id', 'entity1_id_0x21');
      expect(res2).toEqual({id: 'entity1_id_0x21', field1: 1});
    });

    it('corretly merges data from the setCache', async () => {
      const results = await cacheModel.getByFields(
        // Any needed to get past type check
        [['field1', '=', 1]],
        {offset: 0, limit: 30}
      );

      expect(results.length).toEqual(30);

      // This should exclude all the cache values where field1 = 0
      // The database would still have those values as 1
      expect(results.map((res) => res.id)).toEqual([
        'entity1_id_0x0',
        'entity1_id_0x1',
        'entity1_id_0x10',
        'entity1_id_0x11',
        'entity1_id_0x12',
        'entity1_id_0x13',
        'entity1_id_0x14',
        'entity1_id_0x15',
        'entity1_id_0x16',
        'entity1_id_0x17',
        'entity1_id_0x18',
        'entity1_id_0x19',
        'entity1_id_0x2',
        'entity1_id_0x21',
        'entity1_id_0x23',
        'entity1_id_0x25',
        'entity1_id_0x27',
        'entity1_id_0x29',
        'entity1_id_0x3',
        'entity1_id_0x30',
        'entity1_id_0x31',
        'entity1_id_0x32',
        'entity1_id_0x33',
        'entity1_id_0x34',
        'entity1_id_0x35',
        'entity1_id_0x36',
        'entity1_id_0x37',
        'entity1_id_0x38',
        'entity1_id_0x39',
        'entity1_id_0x4',
      ]);
    });

    it('corretly orders and offsets data with setCache', async () => {
      const results = await cacheModel.getByFields([['field1', 'in', [0, 1]]], {
        offset: 15,
        limit: 10,
        orderBy: 'field1',
        orderDirection: 'DESC',
      });

      expect(results.length).toEqual(10);
      expect(results.map((r) => r.field1)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    });
  });
});
