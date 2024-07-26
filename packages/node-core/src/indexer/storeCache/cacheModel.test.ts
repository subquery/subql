// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphQLModelsType} from '@subql/utils';
import {Sequelize, DataTypes, QueryTypes} from '@subql/x-sequelize';
import {cloneDeep, padStart} from 'lodash';
import {DbOption, modelsTypeToModelAttributes, NodeConfig} from '../../';
import {CachedModel} from './cacheModel';

const option: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

jest.setTimeout(50_000);

describe('cacheMetadata integration', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;
  let cacheModel: CachedModel<{id: string; field1: number}>;

  const flush = async (blockHeight: number) => {
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
    const formatIdNumber = (n: number): string => padStart(`${n}`, 3, '0');

    beforeAll(async () => {
      // Pre-populate some data and flush it do the db
      let n = 0;
      while (n < 100) {
        cacheModel.set(
          `entity1_id_0x${formatIdNumber(n)}`,
          {
            id: `entity1_id_0x${formatIdNumber(n)}`,
            field1: 1,
          },
          1
        );
        n++;
      }

      await flush(2);

      // Updates to existing data
      let m = 20;
      while (m < 30) {
        cacheModel.set(
          `entity1_id_0x${formatIdNumber(m)}`,
          {
            id: `entity1_id_0x${formatIdNumber(m)}`,
            field1: m % 2,
          },
          3
        );
        m++;
      }

      // New data
      let o = 100;
      while (o < 130) {
        cacheModel.set(
          `entity1_id_0x${formatIdNumber(o)}`,
          {
            id: `entity1_id_0x${formatIdNumber(o)}`,
            field1: 2,
          },
          3
        );
        o++;
      }
    });

    it('gets one item correctly', async () => {
      // Db value
      const res0 = await cacheModel.getOneByField('id', 'entity1_id_0x001');
      expect(res0).toEqual({id: 'entity1_id_0x001', field1: 1});

      // Cache value
      const res1 = await cacheModel.getOneByField('id', 'entity1_id_0x020');
      expect(res1).toEqual({id: 'entity1_id_0x020', field1: 0});

      // Cache value
      const res2 = await cacheModel.getOneByField('id', 'entity1_id_0x021');
      expect(res2).toEqual({id: 'entity1_id_0x021', field1: 1});
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
        // Cache Data
        'entity1_id_0x021',
        'entity1_id_0x023',
        'entity1_id_0x025',
        'entity1_id_0x027',
        'entity1_id_0x029',
        // DB data
        'entity1_id_0x000',
        'entity1_id_0x001',
        'entity1_id_0x002',
        'entity1_id_0x003',
        'entity1_id_0x004',
        'entity1_id_0x005',
        'entity1_id_0x006',
        'entity1_id_0x007',
        'entity1_id_0x008',
        'entity1_id_0x009',
        'entity1_id_0x010',
        'entity1_id_0x011',
        'entity1_id_0x012',
        'entity1_id_0x013',
        'entity1_id_0x014',
        'entity1_id_0x015',
        'entity1_id_0x016',
        'entity1_id_0x017',
        'entity1_id_0x018',
        'entity1_id_0x019',
        'entity1_id_0x030',
        'entity1_id_0x031',
        'entity1_id_0x032',
        'entity1_id_0x033',
        'entity1_id_0x034',
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

    it('gets correct results with no filter', async () => {
      // Cache data first
      const ids: string[] = [];
      let n = 20;
      while (n < 30) {
        ids.push(`entity1_id_0x${formatIdNumber(n)}`);
        n++;
      }
      n = 100;
      while (n < 130) {
        ids.push(`entity1_id_0x${formatIdNumber(n)}`);
        n++;
      }

      // TODO make limit bigger to get DB data as well

      const results = await cacheModel.getByFields([], {offset: 0, limit: 30});

      expect(results.map((r) => r.id)).toEqual(ids.slice(0, 30));
    });

    describe('offsets with cache data', () => {
      let fullResults: {id: string; field1: number}[];

      beforeAll(async () => {
        fullResults = await cacheModel.getByFields([], {offset: 0, limit: 50});
      });

      it('gets data before cache', async () => {
        const results = await cacheModel.getByFields([], {offset: 5, limit: 15});
        expect(results).toEqual(fullResults.slice(5).slice(0, 15));
      });

      it('gets data before and in cache', async () => {
        const results = await cacheModel.getByFields([], {offset: 15, limit: 20});
        expect(results).toEqual(fullResults.slice(15).slice(0, 20));
      });

      it('gets data within cache', async () => {
        const results = await cacheModel.getByFields([], {offset: 20, limit: 5});
        expect(results).toEqual(fullResults.slice(20).slice(0, 5));
      });

      it('gets data after cache', async () => {
        const results = await cacheModel.getByFields([], {offset: 30, limit: 20});
        expect(results).toEqual(fullResults.slice(30).slice(0, 20));
      });
    });

    describe('data only in cache', () => {
      it('selects data in the cache', async () => {
        const result = await cacheModel.getByFields([['field1', '=', 2]]);
        expect(result.length).toEqual(30);
      });

      it('selects data from the cache and db in the right order', async () => {
        const result = await cacheModel.getByFields([], {limit: 50, orderDirection: 'DESC'});
        expect(result[0].id).toEqual('entity1_id_0x129'); // Failing because we cant offset cache data correctly
        expect(result[result.length - 1].id).toEqual('entity1_id_0x090');
      });
    });
  });
});

describe('cacheModel integration', () => {
  let sequelize: Sequelize;
  let schema: string;
  let model: any;
  let cacheModel: CachedModel<{
    id: string;
    selfStake: bigint;
    oneEntity: TestJson;
    delegators: DelegationFrom[];
    randomNArray?: number[];
  }>;

  const flush = async (blockHeight: number) => {
    const tx = await sequelize.transaction();
    await cacheModel.flush(tx, blockHeight);
    await tx.commit();
  };

  interface TestJson {
    testItem: string;
    amount?: bigint;
  }

  interface DelegationFrom {
    delegator: string;
    amount?: bigint;
    nested?: TestJson;
  }

  beforeAll(async () => {
    sequelize = new Sequelize(
      `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`,
      option
    );
    await sequelize.authenticate();

    schema = '"model-test-2"';
    await sequelize.createSchema(schema, {});

    const modelType: GraphQLModelsType = {
      name: 'testModel',
      fields: [
        {
          name: 'id',
          type: 'ID',
          isArray: false,
          nullable: false,
          isEnum: false,
        },
        {
          name: 'selfStake',
          type: 'BigInt',
          nullable: false,
          isEnum: false,
          isArray: false,
        },
        {
          name: 'oneEntity',
          type: 'Json',
          nullable: false,
          isEnum: false,
          isArray: false,
          jsonInterface: {
            name: 'TestJson',
            fields: [
              {name: 'testItem', type: 'String', isArray: false, nullable: false},
              {name: 'amount', type: 'BigInt', isArray: false, nullable: false},
            ],
          },
        },
        {
          name: 'delegators',
          type: 'Json',
          nullable: false,
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
        {
          name: 'randomNArray',
          type: 'Int',
          nullable: true,
          isEnum: false,
          isArray: true,
        },
      ],
      indexes: [],
    };
    const modelAttributes = modelsTypeToModelAttributes(modelType, new Map(), schema);

    const modelFactory = sequelize.define('testModel', modelAttributes, {timestamps: false, schema: schema});
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

  async function setDefaultData(id: string, height: number, data?: any): Promise<void> {
    cacheModel.set(
      id,
      data ?? {
        id,
        selfStake: BigInt(1000000000000000000000n),
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        delegators: [{delegator: '0x02', amount: BigInt(1000000000000000000000n)}],
        randomNArray: [1, 2, 3, 4, 5],
      },
      height
    );
    await flush(height + 1);
  }

  describe('cached data and db data compare', () => {
    it('bigint value in jsonb', async () => {
      await setDefaultData('0x01', 1);

      // force clear get cache
      (cacheModel as any).getCache.clear();

      // Db value
      const res0 = await cacheModel.get('0x01');
      console.log(JSON.stringify(res0));

      expect(res0).toEqual({
        delegators: [
          {
            amount: BigInt(1000000000000000000000n),
            delegator: '0x02',
          },
        ],
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        id: '0x01',
        selfStake: BigInt(1000000000000000000000n),
        randomNArray: [1, 2, 3, 4, 5],
      });

      // Cache value
      const res1 = await cacheModel.get('0x01');
      console.log(JSON.stringify(res1));
      expect(res1).toEqual({
        delegators: [
          {
            amount: BigInt(1000000000000000000000n),
            delegator: '0x02',
          },
        ],
        id: '0x01',
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        selfStake: BigInt(1000000000000000000000n),
        randomNArray: [1, 2, 3, 4, 5],
      });

      // Update the value
      res1?.delegators.push({delegator: '0x03', amount: BigInt(9000000000000000000000n)});

      cacheModel.set(`0x01`, res1!, 2);
      await flush(3);
      const res2 = await cacheModel.get('0x01');
      console.log(JSON.stringify(res2));

      expect(res2).toEqual({
        id: '0x01',
        selfStake: BigInt(1000000000000000000000n),
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        delegators: [
          {delegator: '0x02', amount: BigInt(1000000000000000000000n)},
          {delegator: '0x03', amount: BigInt(9000000000000000000000n)},
        ],
        randomNArray: [1, 2, 3, 4, 5],
      });

      // check actually stored bigint in json in the db
      const [oneEntityRow] = await sequelize.query(`SELECT "oneEntity" FROM ${schema}."testModels" LIMIT 1;`, {
        type: QueryTypes.SELECT,
      });
      expect(oneEntityRow).toStrictEqual({
        oneEntity: {
          amount: '8000000000000000000000n',
          testItem: 'test',
        },
      });

      // check actually stored bigint in json Array in the db
      const [rows] = await sequelize.query(`SELECT "delegators" FROM ${schema}."testModels" LIMIT 1;`, {
        type: QueryTypes.SELECT,
      });
      expect(rows).toStrictEqual({
        delegators: [
          {
            amount: '1000000000000000000000n',
            delegator: '0x02',
          },
          {
            amount: '9000000000000000000000n',
            delegator: '0x03',
          },
        ],
      });

      // check nest jsonb value
      res1?.delegators.push({
        delegator: '0x04',
        amount: BigInt(6000000000000000000000n),
        nested: {testItem: 'test', amount: BigInt(6000000000000000000000n)},
      });
      cacheModel.set(`0x01`, res1!, 4);
      await flush(5);
      const [rows2] = await sequelize.query(`SELECT delegators FROM ${schema}."testModels" LIMIT 1;`, {
        type: QueryTypes.SELECT,
      });
      expect(rows2).toStrictEqual({
        delegators: [
          {
            amount: '1000000000000000000000n',
            delegator: '0x02',
          },
          {
            amount: '9000000000000000000000n',
            delegator: '0x03',
          },
          {
            amount: '6000000000000000000000n',
            delegator: '0x04',
            nested: {
              testItem: 'test',
              amount: '6000000000000000000000n', // We are expected nest json bigint also been handled
            },
          },
        ],
      });

      // it should ignore the bigint value if it is undefined or null
      const data0x02 = {
        id: `0x02`,
        selfStake: BigInt(1000000000000000000000n),
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        delegators: [
          {
            delegator: '0x05',
            amount: undefined,
            nested: {testItem: 'test', amount: undefined},
          },
        ],
        randomNArray: undefined,
      };
      cacheModel.set(`0x02`, data0x02, 6);
      await flush(7);
      const res5 = (
        await cacheModel.model.findOne({
          where: {id: '0x02'} as any,
        })
      )?.toJSON();
      expect(res5?.delegators).toEqual(data0x02.delegators);
    });

    it('empty array test, compare db result with cache data', async () => {
      await setDefaultData('0x09', 1, {
        id: '0x09',
        selfStake: BigInt(1000000000000000000000n),
        oneEntity: {testItem: 'test', amount: BigInt(8000000000000000000000n)},
        delegators: [{delegator: '0x02', amount: BigInt(1000000000000000000000n)}],
        randomNArray: undefined,
      });

      // Cache value 1, before cache is cleared
      const resCache1 = await cacheModel.get('0x09');
      expect(resCache1?.randomNArray).toBeUndefined();

      // force clear get cache
      (cacheModel as any).getCache.clear();

      // Db value
      const res0 = await cacheModel.get('0x09');
      expect(res0?.randomNArray).toBe(null);

      // Cache value 2, after cache is set from db value
      const resCache2 = await cacheModel.get('0x09');
      expect(resCache2?.randomNArray).toBe(null);

      // We are expecting DB value and get cache value to be the same
      expect(res0).toEqual(resCache2);

      // We are expecting DB value and set cache value can be difference, field value can be undefined and null
      expect(res0).not.toEqual(resCache1);
    });

    it('get and update, without save, get again should not be updated value', async () => {
      await setDefaultData(`0x10`, 1);

      // Db value
      const res0 = await cacheModel.get('0x10');
      const copiedRes0 = cloneDeep(res0);

      // Update the value
      res0?.delegators.push({delegator: '0x11', amount: BigInt(9000000000000000000000n)});

      // Get it again
      const res1 = await cacheModel.get('0x10');

      // should be same before updated
      expect(res1).toEqual(copiedRes0);
    });
  });
});
