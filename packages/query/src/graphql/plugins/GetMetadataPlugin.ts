// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {URL} from 'url';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch, {Response} from 'node-fetch';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

const {version: packageVersion} = require('../../../package.json');
const indexerUrl = argv('indexer') as string | undefined;

const METADATA_TYPES = {
  lastProcessedHeight: 'number',
  lastProcessedTimestamp: 'number',
  targetHeight: 'number',
  chain: 'string',
  specName: 'string',
  genesisHash: 'string',
  indexerHealthy: 'boolean',
  indexerNodeVersion: 'string',
  queryNodeVersion: 'string',
};

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

async function fetchFromTable(pgClient: any, schemaName: string): Promise<Metadata> {
  const metadata = {} as Metadata;
  const keys = Object.keys(METADATA_TYPES);

  const {rows} = await pgClient.query(`select key, value from ${schemaName}._metadata WHERE key = ANY ($1)`, [keys]);
  const dbKeyValue = [];

  rows.forEach((o: {key: string; value: string | number | boolean}) => {
    dbKeyValue[o.key] = o.value;
  });

  for (const key in METADATA_TYPES) {
    if (typeof dbKeyValue[key] === METADATA_TYPES[key]) {
      metadata[key] = dbKeyValue[key];
    }
  }

  metadata.queryNodeVersion = packageVersion;

  return metadata;
}

export const GetMetadataPlugin = makeExtendSchemaPlugin((build, options) => {
  const schemaName = options.pgSchemas;
  let metadataTableExists = false;

  const tableSearch = build.pgIntrospectionResultsByKind.attribute.find(
    (attr: {class: {name: string}}) => attr.class.name === '_metadata'
  );

  if (tableSearch !== undefined) {
    metadataTableExists = true;
  }

  if (argv(`indexer`)) {
    setAsyncInterval(fetchFromApi, 10000);
  }

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
        _metadata: async (_parentObject, _args, context, _info): Promise<Metadata> => {
          if (metadataTableExists) {
            const metadata = await fetchFromTable(context.pgClient, schemaName);

            if (Object.keys(metadata).length > 0) {
              return metadata;
            }
          }

          if (argv(`indexer`)) {
            return metaCache;
          }

          return;
        },
      },
    },
  };
});
