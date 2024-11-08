// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {DbOption} from '@subql/node-core/db';
import {DataTypes, Sequelize} from '@subql/x-sequelize';
import {before} from 'lodash';
import {NodeConfig} from '../../../configure';
import {CachedModel} from './cacheModel';
import {PlainModel} from './model';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(50_000);

describe('plainModeldata test', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;
  let historicalModel: any;
  // let plainModel: PlainModel<{id: string; field1: number}>;

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    schema = '"model-test-1"';
    await sequelize.createSchema(schema, {});

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
    const historicalModelFactory = sequelize.define(
      'historicalTestModel',
      {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
        },
        field1: DataTypes.INTEGER,
        _id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        _block_range: {
          type: DataTypes.RANGE(DataTypes.BIGINT),
          allowNull: false,
        },
      },
      {timestamps: false, schema: schema}
    );
    historicalModel = await historicalModelFactory.sync().catch((e) => {
      console.log('error', e);
      throw e;
    });

    const i = 0;
  });

  afterAll(async () => {
    await sequelize.dropSchema(schema, {logging: false});
    await sequelize.close();
  });

  describe('disable historical', () => {
    let plainModel: PlainModel<{id: string; field1: number}>;
    let cacheModel: CachedModel<{id: string; field1: number}>;
    let i = 0;
    beforeAll(() => {
      plainModel = new PlainModel(model, false);
      cacheModel = new CachedModel(model, false, new NodeConfig({} as any), () => i++);
    });

    it('insert data, no _block_range', async () => {
      const id = '1';
      const data = {id, field1: 1};

      await plainModel.set(id, data, 1);
      await cacheModel.set(id, data, 1);

      const result = await plainModel.get(id);
      const cacheResult = await cacheModel.get(id);

      expect(result).toEqual(data);
      expect(cacheResult).toEqual(result);
    });

    it('select data, no _block_range', async () => {
      const id2 = '2';
      const data2 = {id: id2, field1: 2};
      await plainModel.set(id2, data2, 1);
      await cacheModel.set(id2, data2, 1);
      const result2 = await plainModel.getByFields([['id', '=', id2]], {limit: 1});
      const cacheResult2 = await cacheModel.getByFields([['id', '=', id2]], {limit: 1});
      expect(result2.length).toEqual(1);
      expect(cacheResult2).toEqual(result2);

      const result3 = await plainModel.getByFields([], {limit: 2});
      const cacheResult3 = await cacheModel.getByFields([], {limit: 2});
      expect(result3.length).toEqual(2);
      expect(cacheResult3).toEqual(result3);
    });

    it('update data, no _block_range', async () => {
      const datas = [
        {id: '1', field1: 1},
        {id: '2', field1: 2},
        {id: '3', field1: 3},
      ];
      await plainModel.bulkUpdate(datas, 1);
      await cacheModel.bulkUpdate(datas, 1);

      // const result = await plainModel.get('1');

      const result3 = await plainModel.getByFields([], {limit: 10});
      const cacheResult3 = await cacheModel.getByFields([], {limit: 10});
      expect(result3.length).toEqual(3);
      expect(cacheResult3).toEqual(result3);
    });

    it('delete data, no _block_range', async () => {
      const id = '1';

      await plainModel.bulkRemove(['1'], 1);
      await cacheModel.bulkRemove(['1'], 1);

      const result3 = await plainModel.getByFields([], {limit: 10});
      const cacheResult3 = await cacheModel.getByFields([], {limit: 10});
      expect(result3.length).toEqual(2);
      expect(cacheResult3).toEqual(result3);
    });
  });

  describe('enable historical', () => {
    let plainModel: PlainModel<{id: string; field1: number}>;
    let cacheModel: CachedModel<{id: string; field1: number}>;
    beforeAll(() => {
      let i = 0;
      plainModel = new PlainModel(historicalModel, true);
      cacheModel = new CachedModel(historicalModel, true, new NodeConfig({} as any), () => i++);
    });

    it('insert data, exist _block_range', async () => {
      const id = '1';
      const data = {id, field1: 1};

      await cacheModel.set(id, data, 1);
      const cacheResult = await cacheModel.get(id);

      await plainModel.set(id, data, 1);
      const result = await plainModel.get(id);

      expect((result as any)._block_range).toEqual([1, null]);
      expect(result).toEqual(data);
      expect(cacheResult).toEqual(result);
    });
  });
});
