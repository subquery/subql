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

    server = await createApolloServer();
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
    const GQL_QUERY = gql`
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
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('to filter historical top level', async () => {
    const GQL_QUERY = gql`
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
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('to filter historical nested (forward)', async () => {
    const GQL_QUERY = gql`
      query {
        listings(filter: {item: {approved: {equalTo: true}}}) {
          nodes {
            id
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });

  it('to filter historical nested (backward)', async () => {
    const GQL_QUERY = gql`
      query {
        items(filter: {listings: {some: {priceToken: {equalTo: "foo"}}}}) {
          nodes {
            id
          }
        }
      }
    `;

    const res = await server.executeOperation({query: GQL_QUERY});
    expect(res.errors).toBeUndefined();

    expect(sqlSpy.mock.calls[0][0]).toMatchSnapshot();
  });
});
