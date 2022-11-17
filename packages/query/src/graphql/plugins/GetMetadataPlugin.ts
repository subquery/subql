// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {URL} from 'url';
import {getMetadataTableName, MetaData, METADATA_REGEX, MULTI_METADATA_REGEX} from '@subql/utils';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import fetch, {Response} from 'node-fetch';
import {Build} from 'postgraphile-core';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

const {version: packageVersion} = require('../../../package.json');

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
  dynamicDatasources: 'string',
};

type MetaType = number | string | boolean;

type MetaEntry = {key: string; value: MetaType};

const metaCache = {
  queryNodeVersion: packageVersion,
} as MetaData;

async function fetchFromApi(): Promise<void> {
  let health: Response;
  let meta: Response;

  const indexerUrl = argv('indexer') as string | undefined;

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

async function fetchFromTable(pgClient, schemaName: string, chainId: string | undefined): Promise<MetaData> {
  const metadata = {} as MetaData;
  const keys = Object.keys(METADATA_TYPES);

  const tableName = getMetadataTableName(chainId);
  const {rows} = await pgClient.query(`select * from "${schemaName}".${tableName} WHERE key = ANY ($1)`, [keys]);

  const dbKeyValue = rows.reduce((array: MetaEntry[], curr: MetaEntry) => {
    array[curr.key] = curr.value;
    return array;
  }, {}) as {[key: string]: MetaType};

  for (const key in METADATA_TYPES) {
    if (typeof dbKeyValue[key] === METADATA_TYPES[key]) {
      metadata[key] = dbKeyValue[key];
    }
  }

  metadata.queryNodeVersion = packageVersion;

  const tableEstimates = await pgClient
    .query(
      `select relname as table , reltuples::bigint as estimate from pg_class
      where relnamespace in
            (select oid from pg_namespace where nspname = $1)
      and relname in
          (select table_name from information_schema.tables
           where table_schema = $1)`,
      [schemaName]
    )
    .catch((e) => {
      throw new Error(`Unable to estimate table row count: ${e}`);
    });

  metadata.rowCountEstimate = tableEstimates.rows;

  return metadata;
}

function metadataTableSearch(build: Build, id: string | undefined): boolean {
  return build.pgIntrospectionResultsByKind.attribute.find((attr: {class: {name: string}}) =>
    id ? MULTI_METADATA_REGEX.test(attr.class.name) : METADATA_REGEX.test(attr.class.name)
  );
}

export const GetMetadataPlugin = makeExtendSchemaPlugin((build, options) => {
  const [schemaName] = options.pgSchemas;

  if (argv(`indexer`)) {
    setAsyncInterval(fetchFromApi, 10000);
  }

  return {
    typeDefs: gql`
      type TableEstimate {
        table: String
        estimate: Int
      }

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
        rowCountEstimate: [TableEstimate]
        dynamicDatasources: String
      }
      extend type Query {
        _metadata(chainId: String): _Metadata
      }
    `,
    resolvers: {
      Query: {
        _metadata: async (_parentObject, args, context, _info): Promise<MetaData> => {
          const tableExists = metadataTableSearch(build, args.chainId);

          if (tableExists) {
            const metadata = await fetchFromTable(context.pgClient, schemaName, args.chainId);

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
