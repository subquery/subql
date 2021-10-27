// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch, {Response} from 'node-fetch';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

const {version: packageVersion} = require('../../../package.json');
const indexerUrl = argv('indexer') as string | undefined;

type Metadata = {
  lastProcessedHeight: number;
  lastProcessedTimestamp: number;
  targetHeight: number;
  chain: string;
  specName: string;
  genesisHash: string;
  indexerHealthy: boolean;
  indexerNodeVersion: string;
  queryNodeVersion: string;
};

const metaCache = {
  queryNodeVersion: packageVersion,
} as Metadata;

export const MetadataPlugin = makeExtendSchemaPlugin((build, options) => {
  return {
    typeDefs: gql`
      type _Metadata {
        lastProcessedHeight: Int
        lastProcessedTimestamp: Date
        targetHeight: Int
        chain: String
        specName: String
        genesisHash: String
        indexerHealthy: Boolean
        indexerNodeVersion: String
        queryNodeVersion: String
      }
      extend type Query {
        _metadata: _Metadata
      }
    `,
    resolvers: {
      Query: {
        _metadata: async (parentObject, args, context, info): Promise<Metadata> => {
          const schemaName = options.pgSchemas;

          //need to check if table exists
          const result = await context.pgClient.query(`SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE  table_schema = '${schemaName}'
                AND    table_name   = '_metadata'
                );`);

          if (result.rows[0].exists) {
            const {rows} = await context.pgClient.query(`select * from ${schemaName}._metadata`);
            if (rows.length > 1) {
              //if contains more than just block offset
              const metadata = fetchFromTable(rows);
              return metadata;
            }
          }

          if (argv(`indexer`)) {
            setAsyncInterval(fetchFromApi(), 10000);
            return metaCache;
          }

          return;
        },
      },
    },
  };
});

function fetchFromTable(rows: any): Metadata {
  const metadata = {} as Metadata;

  for (const row of rows) {
    const key = row.key;
    const value = row.value;
    metadata[key] = value;
  }

  metadata.queryNodeVersion = packageVersion;

  return metadata;
}

async function fetchFromApi(): Promise<void> {
  let health: Response;
  let meta: Response;

  try {
    meta = await fetch(new URL(`meta`, indexerUrl));
    const result = await meta.json();
    Object.assign(metaCache, result);
  } catch (e) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer meta, `, e.message);
  }

  try {
    health = await fetch(new URL(`health`, indexerUrl));
    metaCache.indexerHealthy = !!health.ok;
  } catch (e) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer health, `, e.message);
  }
}
