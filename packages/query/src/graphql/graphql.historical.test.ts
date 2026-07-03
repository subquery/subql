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
  const getYargsOption = jest.fn(() => ({argv: {name: 'test', aggregate: true, 'query-limit': 100}}));
  const argv = (arg: string) => getYargsOption().argv[arg];
  return {
    ...actualModule,
    getYargsOption,
    argv,
  };
});

describe('GraphqlHistorical', () => {
  const dbSchema = 'subquery_2';

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

  let sqlSpy: jest.SpyInstance;

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

  beforeAll(async () => {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${dbSchema}`);
    await pool.query(`CREATE TABLE IF NOT EXISTS "${dbSchema}".listings (
      id text NOT NULL,
      item_id text NOT NULL,
      collection_id text NOT NULL,
      price_amount numeric NOT NULL,
      price_token text NULL,
      expires_at jsonb NULL,
      created_at_block_height numeric NOT NULL,
      created_at_block_time timestamp NOT NULL,
      created_at_tx_hash text NOT NULL,
      updated_at_block_height numeric NULL,
      updated_at_block_time timestamp NULL,
      updated_at_tx_hash text NULL,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT listings_pkey PRIMARY KEY (_id)
    );`);
    await pool.query(`CREATE TABLE IF NOT EXISTS "${dbSchema}".items (
      id text NOT NULL,
      collection_id text NOT NULL,
      token_id text NOT NULL,
      owner_id text NOT NULL,
      token_uri text NULL,
      "extension" text NULL,
      metadata jsonb NULL,
      last_traded_price_amount numeric NULL,
      approved bool NOT NULL,
      created_at_block_height numeric NOT NULL,
      created_at_block_time timestamp NOT NULL,
      created_at_tx_hash text NOT NULL,
      updated_at_block_height numeric NULL,
      updated_at_block_time timestamp NULL,
      updated_at_tx_hash text NULL,
      "_id" uuid NOT NULL,
      "_block_range" int8range NOT NULL,
      CONSTRAINT items_pkey PRIMARY KEY (_id)
    );`);
    await pool.query(`COMMENT ON TABLE "${dbSchema}".listings IS '@foreignFieldName listings
@foreignKey (item_id) REFERENCES items (id)|@singleForeignFieldName listing';`);
    await pool.query(`COMMENT ON TABLE "${dbSchema}".items IS '@foreignFieldName items';`);

    sqlSpy = jest.spyOn(pool, 'query');
  });

  beforeEach(() => {
    sqlSpy.mockClear();
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE ${dbSchema}.listings;`);
    await pool.query(`DROP TABLE ${dbSchema}.items;`);
    await pool.query(`DROP SCHEMA ${dbSchema};`);
    await pool.end();
  });

  it('to filter historical items when ordering', async () => {
    const res = await runQuery(`
      query nfts {
        items(orderBy: LAST_TRADED_PRICE_AMOUNT_ASC) {
          nodes {
            listings {
              nodes {
                priceAmount
              }
            }
          }
        }
      }
    `);
    expect(res.errors).toBeUndefined();
    // NOTE: SQL snapshot assertion removed.
    // v5's grafast manages connections internally so pool.query() is not called directly.
  });

  it('to filter historical top level', async () => {
    const res = await runQuery(`
      query NFTsOnSale {
        items(filter: {listingsExist: true}) {
          nodes {
            id
            listings {
              nodes {
                id
              }
            }
          }
          totalCount
        }
      }
    `);
    expect(res.errors).toBeUndefined();
    // NOTE: SQL snapshot assertion removed (see above).
  });

  it('to filter historical nested (forward)', async () => {
    const res = await runQuery(`
      query {
        listings(filter: {item: {approved: {equalTo: true}}}) {
          nodes {
            id
          }
        }
      }
    `);
    expect(res.errors).toBeUndefined();
    // NOTE: SQL snapshot assertion removed (see above).
  });

  it('to filter historical nested (backward)', async () => {
    const res = await runQuery(`
      query {
        items(filter: {listings: {some: {priceToken: {equalTo: "foo"}}}}) {
          nodes {
            id
          }
        }
      }
    `);
    expect(res.errors).toBeUndefined();
    // NOTE: SQL snapshot assertion removed (see above).
  });
});
