// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Pool} from 'pg';
import {makeSchema} from 'postgraphile';
import {makePgService} from 'postgraphile/@dataplan/pg/adaptors/pg';
import {grafast} from 'postgraphile/grafast';
import {Config} from '../configure';
import {queryPreset} from './plugins';

jest.mock('../yargs', () => {
  const actualModule = jest.requireActual('../yargs');
  const getYargsOption = jest.fn(() => ({
    argv: {name: 'test', aggregate: true, 'query-limit': 100, 'order-by-nulls-last': true},
  }));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    ...actualModule,
    getYargsOption,
    argv,
  };
});

describe('GraphqlModule', () => {
  const dbSchema = 'subquery_1';

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

  async function insertMetadata(key: string, value: string) {
    await pool.query(`INSERT INTO subquery_1._metadata(
            key, value, "createdAt", "updatedAt")
            VALUES ('${key}', '${value}', '2021-11-07 07:02:31.768+00', '2021-11-07 07:02:31.768+00');`);
  }

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

  beforeEach(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
    await pool.query(`CREATE TABLE IF NOT EXISTS subquery_1._metadata (
            key character varying(255) COLLATE pg_catalog."default" NOT NULL,
            value jsonb,
            "createdAt" timestamp with time zone NOT NULL,
            "updatedAt" timestamp with time zone NOT NULL,
            CONSTRAINT _metadata_pkey PRIMARY KEY (key)
        )`);

    await pool.query(`CREATE TABLE "${dbSchema}"."pool_snapshots" (
            "id" text COLLATE "pg_catalog"."default" NOT NULL,
            "pool_id" text COLLATE "pg_catalog"."default" NOT NULL,
            "block_number" int4 NOT NULL,
            "total_reserve" numeric,
            CONSTRAINT "pool_snapshots_pkey" PRIMARY KEY ("id")
          )`);
  });

  afterEach(async () => {
    await pool.query(`DROP TABLE "${dbSchema}"."pool_snapshots"`);
    await pool.query(`DROP TABLE subquery_1._metadata`);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('can query all metadata fields from database', async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', '398'),
      insertMetadata('lastProcessedTimestamp', '110101'),
      insertMetadata('targetHeight', '7595931'),
      insertMetadata('chain', `"Polkadot"`),
      insertMetadata('specName', `"polkadot"`),
      insertMetadata('genesisHash', `"0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"`),
      insertMetadata('indexerHealthy', 'true'),
      insertMetadata('indexerNodeVersion', `"0.21-0"`),
    ]);

    const result = await runQuery(`
      query {
        _metadata {
          lastProcessedHeight
          lastProcessedTimestamp
          targetHeight
          chain
          specName
          genesisHash
          indexerHealthy
          indexerNodeVersion
        }
      }
    `);

    const fetchedMeta = result?.data?._metadata;
    expect(fetchedMeta).toMatchObject({
      lastProcessedHeight: 398,
      lastProcessedTimestamp: '110101',
      targetHeight: 7595931,
      chain: 'Polkadot',
      specName: 'polkadot',
      genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      indexerHealthy: true,
      indexerNodeVersion: '0.21-0',
    });
  });

  it('wont resolve fields that arent allowed metadata', async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', '398'),
      insertMetadata('chain', `"Polkadot"`),
      insertMetadata('indexerHealthy', 'true'),
      insertMetadata('fakeMetadata', 'true'),
    ]);

    const result = await runQuery(`
      query {
        _metadata {
          lastProcessedHeight
          chain
          indexerHealthy
          fakeMetadata
        }
      }
    `);
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('Cannot query field "fakeMetadata" on type "_Metadata"');
  });

  it('resolve incorrect fields in db to null when queried from graphql', async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', `"Polkadot"`),
      insertMetadata('chain', 'true'),
      insertMetadata('indexerHealthy', '20'),
    ]);

    const result = await runQuery(`
      query {
        _metadata {
          lastProcessedHeight
          chain
          indexerHealthy
        }
      }
    `);

    const fetchedMeta = result?.data?._metadata;
    expect(fetchedMeta).toMatchObject({
      lastProcessedHeight: null,
      chain: null,
      indexerHealthy: null,
    });
  });

  // github issue #2387 : orderBy with orderByNull
  it('PgOrderByUnique plugin correctly orders NULL values using orderByNull param', async () => {
    await pool.query(`
      INSERT INTO "${dbSchema}"."pool_snapshots" ("id", "pool_id", "block_number", "total_reserve") VALUES
      ('1', '1', 15921, NULL),
      ('2', '2', 8743, NULL),
      ('3', '3', 87, '100'),
      ('4', '4', 13288, '200')
    `);

    // Query with orderBy desc and orderByNull (NULLS_LAST)
    const resultNullsLast = await runQuery(`
      query {
        poolSnapshots(orderBy: TOTAL_RESERVE_DESC, orderByNull: NULLS_LAST) {
          nodes {
            rowId
            totalReserve
          }
        }
      }
    `);

    expect(resultNullsLast.errors).toBeUndefined();

    const snapshotsNullsLast = resultNullsLast.data?.poolSnapshots.nodes;
    // Non-null rows order is deterministic
    expect(snapshotsNullsLast[0]).toEqual({rowId: '4', totalReserve: '200'});
    expect(snapshotsNullsLast[1]).toEqual({rowId: '3', totalReserve: '100'});
    // Null rows come last (NULLS_LAST), but their relative order may vary
    expect(snapshotsNullsLast[2].totalReserve).toBeNull();
    expect(snapshotsNullsLast[3].totalReserve).toBeNull();
    const nullsLastIds = snapshotsNullsLast
      .slice(2)
      .map((r: any) => r.rowId)
      .sort();
    expect(nullsLastIds).toEqual(['1', '2']);

    // Query with orderBy desc and orderByNull (NULLS_FIRST)
    const resultNullsFirst = await runQuery(`
      query {
        poolSnapshots(orderBy: TOTAL_RESERVE_DESC, orderByNull: NULLS_FIRST) {
          nodes {
            rowId
            totalReserve
          }
        }
      }
    `);

    expect(resultNullsFirst.errors).toBeUndefined();

    const snapshotsNullsFirst = resultNullsFirst.data?.poolSnapshots.nodes;

    // Null rows come first (NULLS_FIRST), but their relative order may vary
    expect(snapshotsNullsFirst[0].totalReserve).toBeNull();
    expect(snapshotsNullsFirst[1].totalReserve).toBeNull();
    const nullsFirstIds = snapshotsNullsFirst
      .slice(0, 2)
      .map((r: any) => r.rowId)
      .sort();
    expect(nullsFirstIds).toEqual(['1', '2']);
    // Non-null rows come after nulls in deterministic order
    expect(snapshotsNullsFirst[2]).toEqual({rowId: '4', totalReserve: '200'});
    expect(snapshotsNullsFirst[3]).toEqual({rowId: '3', totalReserve: '100'});
  });
});
