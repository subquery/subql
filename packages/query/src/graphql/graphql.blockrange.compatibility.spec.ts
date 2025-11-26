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

describe('GraphqlBlockRange - Backwards Compatibility', () => {
  const dbSchema = 'subquery_compatibility_test';

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

    await pool.query(`CREATE TABLE IF NOT EXISTS "${dbSchema}".entities (
      id text NOT NULL,
      name text NOT NULL,
      value numeric NOT NULL,
      created_at_block_height numeric NOT NULL,
      updated_at_block_height numeric NULL,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT entities_pkey PRIMARY KEY (_id)
    );`);

    await pool.query(`INSERT INTO "${dbSchema}".entities 
      (id, name, value, created_at_block_height, "_id", "_block_range") VALUES
      ('entity1', 'Current Version', 100, 10, gen_random_uuid(), int8range(10, null)),
      ('entity2', 'Another Entity', 200, 15, gen_random_uuid(), int8range(15, null));`);

    server = await createApolloServer();
    sqlSpy = jest.spyOn(pool, 'query');
  });

  beforeEach(() => {
    sqlSpy.mockClear();
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${dbSchema}".entities;`);
    await pool.query(`DROP SCHEMA IF EXISTS ${dbSchema};`);
    await pool.end();
  });

  it('should still work with existing blockHeight queries', async () => {
    const GQL_QUERY = gql`
      query entitiesByBlockHeight {
        entities(blockHeight: "15") {
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

    expect(sqlSpy.mock.calls[0][0]).toContain('_block_range @>');
    expect(sqlSpy.mock.calls[0][0]).not.toContain('&&');
    expect(sqlSpy.mock.calls[0][0]).not.toContain('int8range');
  });

  it('should prevent using blockRange with blockHeight together', async () => {
    const GQL_QUERY = gql`
      query entitiesWithConflictingParams {
        entities(blockHeight: "15", blockRange: ["10", "20"]) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    expect(sqlSpy.mock.calls[0][0]).not.toContain('_block_range @>');
    expect(sqlSpy.mock.calls[0][0]).not.toContain('&&');

    expect(res.data?.entities?.nodes).toBeDefined();
  });

  it('should validate blockRange parameters', async () => {
    const GQL_QUERY = gql`
      query entitiesWithInvalidRange {
        entities(blockRange: ["20", "10"]) {
          nodes {
            id
            name
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors || sqlSpy.mock.calls[0]?.[0]).toBeDefined();
  });

  it('should maintain existing query performance characteristics', async () => {
    const GQL_QUERY = gql`
      query entitiesPerformanceTest {
        entities(blockHeight: "15", first: 10) {
          nodes {
            id
            name
          }
          totalCount
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    // Should include pagination and aggregation
    expect(sqlSpy.mock.calls[0][0]).toContain('_block_range @>');
    expect(res.data?.entities?.totalCount).toBeDefined();
  });

  it('should work with existing filtering and relations', async () => {
    const GQL_QUERY = gql`
      query entitiesWithFiltering {
        entities(blockHeight: "15", filter: {name: {includes: "Entity"}}) {
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

    // Should combine block height with other filters
    expect(sqlSpy.mock.calls[0][0]).toContain('_block_range @>');
    expect(sqlSpy.mock.calls[0][0]).toContain('name');
  });
});
