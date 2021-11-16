// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApolloServer, gql} from 'apollo-server-express';
import {Pool} from 'pg';
import {getPostGraphileBuilder} from 'postgraphile-core';
import {Config} from '../configure';
import {plugins} from './plugins';

describe('GraphqlModule', () => {
  const dbSchema = 'subquery_1';

  const config: Config = new Config({});

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
  });

  afterEach(async () => {
    await pool.query(`DROP TABLE subquery_1._metadata`);
  });

  afterAll((done) => {
    pool.end();
    done();
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
    const fetchedMeta = results.data._metadata;

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
    expect(`${results.errors}`).toEqual(`ValidationError: Cannot query field "fakeMetadata" on type "_Metadata".`);
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
    const fetchedMeta = results.data._metadata;

    expect(fetchedMeta).toMatchObject(mock);
  });
});
