// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Pool} from 'pg';
import {makeSchema} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {grafast} from 'postgraphile/grafast';
import {Config} from '../../../configure';
import {queryPreset} from '../index';

/**
 * Creates a PG pool from env vars, builds a Postgraphile schema from queryPreset
 * + a dynamic schema, and runs a GraphQL query.
 *
 * Usage:
 *   const {pool, runQuery, buildTestSchema} = createTestContext('my_schema');
 *   beforeAll(async () => { await pool.query(`CREATE TABLE ...`); });
 *   afterAll(async () => { await pool.query(`DROP SCHEMA ... CASCADE`); await pool.end(); });
 *   it('test', async () => {
 *     const result = await runQuery(`{ ... }`);
 *     expect(result.errors).toBeUndefined();
 *   });
 */
export function createTestContext(dbSchema: string) {
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

  return {pool, buildTestSchema, runQuery};
}
