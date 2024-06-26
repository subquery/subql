// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getPostGraphileBuilder} from '@subql/x-postgraphile-core';
import {ApolloServer, gql} from 'apollo-server-express';
import {Pool} from 'pg';
import {Config} from '../configure';
import {plugins} from './plugins';

jest.mock('../yargs', () => {
  const actualModule = jest.requireActual('../yargs');
  const getYargsOption = jest.fn(() => ({argv: {name: 'test', aggregate: true}}));
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

    const server = await createApolloServer();

    const GET_META = gql`
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
    `;

    const mock = {
      lastProcessedHeight: 398,
      lastProcessedTimestamp: '110101',
      targetHeight: 7595931,
      chain: 'Polkadot',
      specName: 'polkadot',
      genesisHash: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      indexerHealthy: true,
      indexerNodeVersion: '0.21-0',
    };

    const results = await server.executeOperation({query: GET_META});
    const fetchedMeta = results.data?._metadata;

    expect(fetchedMeta).toMatchObject(mock);
  });

  it('wont resolve fields that arent allowed metadata', async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', '398'),
      insertMetadata('chain', `"Polkadot"`),
      insertMetadata('indexerHealthy', 'true'),
      insertMetadata('fakeMetadata', 'true'),
    ]);

    const server = await createApolloServer();

    const GET_META = gql`
      query {
        _metadata {
          lastProcessedHeight
          chain
          indexerHealthy
          fakeMetadata
        }
      }
    `;

    const results = await server.executeOperation({query: GET_META});
    expect(`${results.errors}`).toEqual(`Cannot query field "fakeMetadata" on type "_Metadata".`);
  });

  it('resolve incorrect fields in db to null when queried from graphql', async () => {
    await Promise.all([
      insertMetadata('lastProcessedHeight', `"Polkadot"`),
      insertMetadata('chain', 'true'),
      insertMetadata('indexerHealthy', '20'),
    ]);

    const server = await createApolloServer();

    const GET_META = gql`
      query {
        _metadata {
          lastProcessedHeight
          chain
          indexerHealthy
        }
      }
    `;

    const mock = {
      lastProcessedHeight: null,
      chain: null,
      indexerHealthy: null,
    };

    const results = await server.executeOperation({query: GET_META});
    const fetchedMeta = results.data?._metadata;

    expect(fetchedMeta).toMatchObject(mock);
  });

  // sum(price_amount)
  it('AggregateSpecsPlugin support big number', async () => {
    await pool.query(
      `INSERT INTO "${dbSchema}"."pool_snapshots" ("id", "pool_id", "block_number", "total_reserve") VALUES ('1', '1', 1, '1')`
    );
    await pool.query(
      `INSERT INTO "${dbSchema}"."pool_snapshots" ("id", "pool_id", "block_number", "total_reserve") VALUES ('2', '1', 1, '20000000000000000000000')`
    );

    const server = await createApolloServer();

    const GET_META = gql`
      query {
        poolSnapshots(first: 25) {
          nodes {
            totalReserve
            blockNumber
          }
          groupedAggregates(groupBy: []) {
            sum {
              totalReserve
              blockNumber
            }
            max {
              totalReserve
              blockNumber
            }
            min {
              totalReserve
              blockNumber
            }
            average {
              totalReserve
              blockNumber
            }
          }
        }
      }
    `;

    const results = await server.executeOperation({query: GET_META});
    expect(results.data).toBeDefined();

    const nodes = (results.data as any).poolSnapshots.nodes[0];
    expect(nodes.blockNumber).toEqual(1);
    expect(nodes.totalReserve).toEqual('1');

    const aggregate = (results.data as any).poolSnapshots.groupedAggregates[0];
    expect(aggregate.average.totalReserve).toEqual('10000000000000000000001');
    expect(aggregate.sum.totalReserve).toEqual('20000000000000000000001');
    expect(aggregate.min.totalReserve).toEqual('1');
    expect(aggregate.max.totalReserve).toEqual('20000000000000000000000');
  });
});
