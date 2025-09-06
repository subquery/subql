// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getPostGraphileBuilder} from '@subql/x-postgraphile-core';
import {ApolloServer, ExpressContext, gql} from 'apollo-server-express';
import {Pool} from 'pg';
import {Config} from '../configure';
import {getYargsOption} from '../yargs';
import {plugins} from './plugins';

jest.mock('../yargs', () => jest.createMockFromModule('../yargs'));

(getYargsOption as jest.Mock).mockImplementation(() => {
  return {argv: {name: 'test', aggregate: true}};
});

describe('GraphqlBlockRange', () => {
  const dbSchema = 'subquery_blockrange_test';

  const config = new Config({});

  const pool: Pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL client generated error: ', err.message);
  });

  let server: ApolloServer<ExpressContext>;
  let sqlSpy: jest.SpyInstance<void, [queryText: string, values: any[], callback?: any]>;

  async function createApolloServer() {
    const builder = await getPostGraphileBuilder(pool, [dbSchema], {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
    });

    const schema = builder.buildSchema();

    const server = new ApolloServer({
      schema,
      context: {
        pgClient: pool,
      },
    });

    return server;
  }

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);

    await pool.query(`CREATE TABLE IF NOT EXISTS "${dbSchema}".test_entities (
      id text NOT NULL,
      name text NOT NULL,
      value numeric NOT NULL,
      created_at_block_height numeric NOT NULL,
      updated_at_block_height numeric NULL,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT test_entities_pkey PRIMARY KEY (_id)
    );`);

    await pool.query(`INSERT INTO "${dbSchema}".test_entities 
      (id, name, value, created_at_block_height, "_id", "_block_range") VALUES
      ('entity1', 'First Version', 100, 5, gen_random_uuid(), int8range(5, 10)),
      ('entity1', 'Second Version', 200, 10, gen_random_uuid(), int8range(10, 20)),
      ('entity1', 'Third Version', 300, 20, gen_random_uuid(), int8range(20, 100)),
      ('entity2', 'Another Entity', 150, 8, gen_random_uuid(), int8range(8, 15)),
      ('entity2', 'Updated Entity', 250, 15, gen_random_uuid(), int8range(15, 25));`);

    server = await createApolloServer();
    sqlSpy = jest.spyOn(pool, 'query');
  });

  beforeEach(() => {
    sqlSpy.mockClear();
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${dbSchema}".test_entities;`);
    await pool.query(`DROP SCHEMA IF EXISTS ${dbSchema};`);
    await pool.end();
  });

  it('should filter entities by block range', async () => {
    const GQL_QUERY = gql`
      query testEntitiesByBlockRange {
        testEntities(blockRange: ["5", "15"]) {
          nodes {
            id
            name
            value
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should return single entity with block range filter', async () => {
    const GQL_QUERY = gql`
      query singleEntityByBlockRange {
        testEntity(id: "entity1", blockRange: ["0", "100"]) {
          id
          name
          value
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should include __block_height in SQL for result transformation', async () => {
    const GQL_QUERY = gql`
      query testEntitiesWithBlockHeight {
        testEntities(blockRange: ["10", "25"]) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should work with existing blockHeight parameter (backwards compatibility)', async () => {
    const GQL_QUERY = gql`
      query testEntitiesByHeight {
        testEntities(blockHeight: "15") {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should handle empty block range gracefully', async () => {
    const GQL_QUERY = gql`
      query testEntitiesEmptyRange {
        testEntities(blockRange: ["1000", "2000"]) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should validate blockRange parameter format', async () => {
    const GQL_QUERY = gql`
      query testEntitiesInvalidRange {
        testEntities(blockRange: ["invalid"]) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('should work with filtering and block range together', async () => {
    const GQL_QUERY = gql`
      query testEntitiesFilteredByBlockRange {
        testEntities(blockRange: ["5", "20"], filter: {name: {includes: "Version"}}) {
          nodes {
            id
            name
            value
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();
    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });
});
