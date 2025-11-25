// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Entity} from '@subql/types-core';
import {DataTypes, Sequelize} from '@subql/x-sequelize';
import _ from 'lodash';
import {NodeConfig} from '../../../configure';
import {DbOption} from '../../../db';
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

describe('Model provider consistency test', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;

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
    model = await modelFactory.sync();
  });

  afterAll(async () => {
    await sequelize.dropSchema(schema, {logging: false});
    await sequelize.close();
  });

  describe('disable historical', () => {
    let plainModel: PlainModel<{id: string; field1?: number}>;
    let cacheModel: CachedModel<{id: string; field1?: number}>;
    let i = 0;
    beforeAll(() => {
      plainModel = new PlainModel(model, false);
      cacheModel = new CachedModel(model, false, new NodeConfig({} as any), () => i++);
    });

    it('insert data', async () => {
      const id = '1';
      const data = {id, field1: 1};

      await plainModel.set(id, data, 1);
      await cacheModel.set(id, data, 1);

      const result = await plainModel.get(id, undefined as any);
      const cacheResult = await cacheModel.get(id);

      expect(result).toEqual(data);
      expect(cacheResult).toEqual(result);
    });

    it('select data', async () => {
      const id2 = '2';
      const data2 = {id: id2, field1: 2};
      await plainModel.set(id2, data2, 1);
      await cacheModel.set(id2, data2, 1);
      const result2 = await plainModel.getByFields([['id', '=', id2]], {limit: 1}, undefined as any);
      const cacheResult2 = await cacheModel.getByFields([['id', '=', id2]], {limit: 1});
      expect(result2.length).toEqual(1);
      expect(cacheResult2).toEqual(result2);

      const result3 = await plainModel.getByFields([], {limit: 2}, undefined as any);
      const cacheResult3 = await cacheModel.getByFields([], {limit: 2});
      expect(result3.length).toEqual(2);
      expect(cacheResult3).toEqual(result3);
    });

    it('update data', async () => {
      const datas = [
        {id: '1', field1: 1},
        {id: '2', field1: 2},
        {id: '3', field1: 3},
      ];
      await plainModel.bulkUpdate(datas, 1);
      await cacheModel.bulkUpdate(datas, 1);

      const result3 = await plainModel.getByFields([], {limit: 10}, undefined as any);
      const cacheResult3 = await cacheModel.getByFields([], {limit: 10});
      expect(result3.length).toEqual(3);
      expect(cacheResult3).toEqual(result3);
    });

    it('delete data', async () => {
      await plainModel.bulkRemove(['1'], 1);
      await cacheModel.bulkRemove(['1'], 1);

      const result3 = await plainModel.getByFields([], {limit: 10}, undefined as any);
      const cacheResult3 = await cacheModel.getByFields([], {limit: 10});
      expect(result3.length).toEqual(2);
      expect(cacheResult3).toEqual(result3);
    });

    it('update with optional fields', async () => {
      // This test checks that `updateOnDuplicate` is correct, previously it would use Object.keys(data[0]) which would cause issues when later data has more keys,
      const data = [
        {id: '1', field1: 1},
        {id: '2', field1: 2},
      ];

      // Set some initial data
      await plainModel.bulkUpdate(data, 1);
      const initial2 = await plainModel.get('2');
      expect(initial2).toEqual({id: '2', field1: 2});

      // Set new data + update previous data
      const data2 = [
        {id: '3'}, // Omit field1 because its optional
        {id: '2', field1: 3},
      ];
      await plainModel.bulkUpdate(data2, 2);
      const updated2 = await plainModel.get('2');
      expect(updated2).toEqual({id: '2', field1: 3});
    });
  });

  describe('alternative id types', () => {
    it('can store an entity with a numeric ID type', async () => {
      const modelFactory = sequelize.define(
        'testModel2',
        {
          id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
          },
          field1: DataTypes.INTEGER,
        },
        {timestamps: false, schema: schema}
      );
      const model2 = await modelFactory.sync();

      let i = 0;

      const plainModel = new PlainModel(model2 as any, false);
      const cacheModel = new CachedModel(model2 as any, false, new NodeConfig({} as any), () => i++);

      const numericData = {
        id: 1,
        field1: 1,
      } as unknown as Entity;

      await plainModel.set(numericData.id.toString(), numericData, 1);
      await cacheModel.set(numericData.id.toString(), numericData, 1);

      const result = await plainModel.get(numericData.id, undefined as any);
      expect(result).toEqual(numericData);

      const cacheResult = await cacheModel.get(numericData.id);
      expect(cacheResult).toEqual(numericData);

      const [getByResult] = await plainModel.getByFields([['field1', '=', 1] as any], {limit: 1}, undefined as any);
      expect(getByResult).toEqual(numericData);

      const [getByCachedResult] = await cacheModel.getByFields([['field1', '=', 1] as any], {limit: 1});
      expect(getByCachedResult).toEqual(numericData);
    });
  });
});
