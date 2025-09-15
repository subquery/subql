// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
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
    await pool.query(`CREATE TABLE "${dbSchema}"."pools" (
            "id" text COLLATE "pg_catalog"."default" NOT NULL,
            CONSTRAINT "pool_pkey" PRIMARY KEY ("id")
          )`);

    await pool.query(`CREATE TABLE "${dbSchema}"."pool_snapshots" (
            "id" text COLLATE "pg_catalog"."default" NOT NULL,
            "pool_id" text COLLATE "pg_catalog"."default" NOT NULL,
            "block_number" int4 NOT NULL,
            "total_reserve" numeric,
            CONSTRAINT "pool_snapshots_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "fk_pool"
            FOREIGN KEY(pool_id)
              REFERENCES "${dbSchema}"."pools"(id)
          )`);
    await pool.query(`INSERT INTO "${dbSchema}"."pools" ("id") VALUES ('1'),('2'),('3'),('4')`);
  });

  afterEach(async () => {
    await pool.query(`DROP SCHEMA "${dbSchema}" CASCADE`);
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

  // sum(price_amount) TODO Wait for resolution
  it.skip('AggregateSpecsPlugin support big number', async () => {
    await pool.query(
      `INSERT INTO "${dbSchema}"."pool_snapshots" ("id", "pool_id", "block_number", "total_reserve") VALUES ('1', '1', 1, '1'),('2', '1', 1, '20000000000000000000000')`
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

  it('AggregateSpecsPlugin sum greaterThan', async () => {
    await pool.query(
      `INSERT INTO "${dbSchema}"."pool_snapshots" ("id", "pool_id", "block_number", "total_reserve") VALUES ('1', '1', 1, '6'),('2', '1', 1, '1111')`
    );
    const server = await createApolloServer();
    const GET_META = gql`
      query {
        pools(filter: {poolSnapshots: {aggregates: {sum: {totalReserve: {greaterThan: "3"}}}}}) {
          nodes {
            poolSnapshots {
              nodes {
                totalReserve
                blockNumber
              }
              groupedAggregates(groupBy: []) {
                sum {
                  totalReserve
                }
              }
            }
          }
        }
      }
    `;

    const results = await server.executeOperation({query: GET_META});

    expect(results.data).toBeDefined();
    expect(results.data!.pools?.nodes[0].poolSnapshots?.groupedAggregates[0]?.sum?.totalReserve).toEqual('1117');
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

    const server = await createApolloServer();

    // Query with orderBy desc and orderByNull (NULLS_LAST)
    const GET_SNAPSHOTS_NULLS_LAST = gql`
      query {
        poolSnapshots(orderBy: TOTAL_RESERVE_DESC, orderByNull: NULLS_LAST) {
          nodes {
            id
            totalReserve
          }
        }
      }
    `;

    const resultsOrderByNullsLast = await server.executeOperation({query: GET_SNAPSHOTS_NULLS_LAST});
    expect(resultsOrderByNullsLast.errors).toBeUndefined();

    const snapshotsNullsLast = resultsOrderByNullsLast.data?.poolSnapshots.nodes;

    // Verify that NULL values appear last
    expect(snapshotsNullsLast).toEqual([
      {id: '4', totalReserve: '200'},
      {id: '3', totalReserve: '100'},
      {id: '1', totalReserve: null},
      {id: '2', totalReserve: null},
    ]);

    // Query with orderBy desc and orderByNull (NULLS_FIRST)
    const GET_SNAPSHOTS_NULLS_FIRST = gql`
      query {
        poolSnapshots(orderBy: TOTAL_RESERVE_DESC, orderByNull: NULLS_FIRST) {
          nodes {
            id
            totalReserve
          }
        }
      }
    `;

    const resultsOrderByNullsFirst = await server.executeOperation({query: GET_SNAPSHOTS_NULLS_FIRST});
    expect(resultsOrderByNullsFirst.errors).toBeUndefined();

    const snapshotsNullsFirst = resultsOrderByNullsFirst.data?.poolSnapshots.nodes;

    // Verify that NULL values appear first
    expect(snapshotsNullsFirst).toEqual([
      {id: '1', totalReserve: null},
      {id: '2', totalReserve: null},
      {id: '4', totalReserve: '200'},
      {id: '3', totalReserve: '100'},
    ]);
  });
});
