// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApolloServer, gql} from 'apollo-server-express';
import {Pool} from 'pg';
import {getPostGraphileBuilder} from 'postgraphile-core';
import {Config} from '../configure';
import {plugins} from './plugins';

describe('query limits', () => {
  const dbSchema = 'subquery_1';

  const config = new Config({});

  const pool = new Pool({
    user: config.get('DB_USER'),
    password: config.get('DB_PASS'),
    host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
    port: config.get('DB_PORT'),
    database: config.get('DB_DATABASE'),
  });

  pool.on('error', (err) => {
    console.error('PostgreSQL client generated error: ', err.message);
  });

  async function createApolloServer() {
    const builder = await getPostGraphileBuilder(pool, [dbSchema], {
      replaceAllPlugins: plugins,
      subscriptions: true,
      dynamicJson: true,
    });

    const schema = builder.buildSchema();

    return new ApolloServer({
      schema,
      context: {
        pgClient: pool,
      },
    });
  }

  afterAll((done) => {
    pool.end();
    done();
  });

  describe('entity limits', () => {
    async function insertPair(key: number, value: number) {
      await pool.query(`INSERT INTO subquery_1.table( key, value) VALUES ('${key}', '${value}');`);
    }

    beforeEach(async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
      await pool.query(`CREATE TABLE IF NOT EXISTS subquery_1.table (
            key   INT, 
            value INT )`);

      for (let i = 0; i < 200; i++) {
        await insertPair(i, i);
      }
    });

    afterEach(async () => {
      await pool.query(`DROP TABLE subquery_1.table`);
    });

    it('unbounded query clamped to safe bound', async () => {
      const LARGE_UNBOUND_QUERY = gql`
        query {
          tables {
            nodes {
              key
              value
            }
          }
        }
      `;

      const server = await createApolloServer();
      const results = await server.executeOperation({query: LARGE_UNBOUND_QUERY});
      expect(results.data.tables.nodes.length).toEqual(100);
    });

    it('bounded unsafe query clamped to safe bound', async () => {
      const LARGE_BOUNDED_QUERY = gql`
        query {
          tables(first: 200) {
            nodes {
              key
              value
            }
          }
        }
      `;

      const server = await createApolloServer();
      const results = await server.executeOperation({query: LARGE_BOUNDED_QUERY});
      expect(results.data.tables.nodes.length).toEqual(100);
    });

    it('bounded safe query remains unchanged', async () => {
      const LARGE_BOUNDED_QUERY = gql`
        query {
          tables(first: 50) {
            nodes {
              key
              value
            }
          }
        }
      `;

      const server = await createApolloServer();
      const results = await server.executeOperation({query: LARGE_BOUNDED_QUERY});
      expect(results.data.tables.nodes.length).toEqual(50);
    });
  });
});
