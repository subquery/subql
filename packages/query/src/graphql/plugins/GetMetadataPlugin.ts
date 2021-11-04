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

async function fetchFromTable(context: any, schemaName: string): Promise<Metadata> {
  const metadata: Metadata = {
    lastProcessedHeight: undefined,
    lastProcessedTimestamp: undefined,
    targetHeight: undefined,
    chain: undefined,
    specName: undefined,
    genesisHash: undefined,
    indexerHealthy: undefined,
    indexerNodeVersion: undefined,
    queryNodeVersion: undefined,
  };

  const {rows} = await context.pgClient.query(`select * from ${schemaName}._metadata`);

  for (const row of rows) {
    const {key, value} = row;

    if (Object.prototype.hasOwnProperty.call(metadata, key)) {
      const field = metadata[key];
      const typedValue = value as typeof field;
      if (typedValue !== null) {
        metadata[key] = typedValue;
      }
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
            const metadata = await fetchFromTable(context, schemaName);

            //check if _metadata contains more than just blockOffset
            if (Object.keys(metadata).length > 1) {
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
