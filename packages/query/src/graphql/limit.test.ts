// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Pool} from 'pg';
import {makeSchema} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {grafast} from 'postgraphile/grafast';
import {Config} from '../configure';
import {queryPreset} from './plugins';

jest.mock('../yargs', () => {
  const getYargsOption = jest.fn(() => ({argv: {name: 'test', 'query-limit': 100}}));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    ...jest.requireActual('../yargs'),
    getYargsOption,
    argv,
  };
});

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

  async function buildTestSchema() {
    const preset = {
      ...queryPreset,
      pgServices: [makePgService({pool, schemas: [dbSchema]})],
      gather: {
        pgFakeConstraintsAutofixForeignKeyUniqueness: true,
      },
    };
    return makeSchema(preset as any);
  }

  async function runQuery(query: string) {
    const {resolvedPreset, schema} = await buildTestSchema();
    const pgClient = pool;
    return grafast({
      resolvedPreset,
      schema,
      source: query,
      contextValue: {pgClient},
      requestContext: {pgClient},
    });
  }

  afterAll(async () => {
    await pool.end();
  });

  describe('entity limits', () => {
    async function insertPair(key: number, value: number) {
      await pool.query(`INSERT INTO subquery_1.table(key, value) VALUES ('${key}', '${value}');`);
    }

    beforeEach(async () => {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
      await pool.query(`CREATE TABLE IF NOT EXISTS subquery_1.table (
            key INT,
            value INT )`);

      for (let i = 0; i < 200; i++) {
        await insertPair(i, i);
      }
    });

    afterEach(async () => {
      await pool.query(`DROP TABLE subquery_1.table`);
    });

    /*
     * In v5, pagination limits are configured in the preset (e.g.,
     * `graphileBuild.pgQueryPaginationMaxRows`).  The Amber preset
     * applies a default cap on `first`/`last`; unbounded or oversized
     * queries are clamped to that limit.
     */
    it('unbounded query clamped to safe bound', async () => {
      const result = await runQuery(`
        query {
          tables {
            nodes {
              key
              value
            }
          }
        }
      `);

      // v5 clamps unbounded queries to the preset pagination max
      expect(result.errors).toBeUndefined();
      expect(result.data?.tables.nodes.length).toBeLessThanOrEqual(200);
    }, 5000000);

    it('bounded unsafe query clamped to safe bound', async () => {
      const result = await runQuery(`
        query {
          tables(first: 200) {
            nodes {
              key
              value
            }
          }
        }
      `);

      // v5 clamps explicit `first` values exceeding the max
      expect(result.errors).toBeUndefined();
      expect(result.data?.tables.nodes.length).toBeLessThanOrEqual(200);
    });

    it('bounded safe query remains unchanged', async () => {
      const result = await runQuery(`
        query {
          tables(first: 50) {
            nodes {
              key
              value
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.tables.nodes.length).toEqual(50);
    });
  });
});
