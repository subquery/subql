// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {URL} from 'url';
import {getMetadataTableName, MetaData, METADATA_REGEX, MULTI_METADATA_REGEX, TableEstimate} from '@subql/utils';
import {PgIntrospectionResultsByKind} from '@subql/x-graphile-build-pg';
import {Build} from '@subql/x-postgraphile-core';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';
import {FieldNode, SelectionNode} from 'graphql';
import {uniq} from 'lodash';
import fetch, {Response} from 'node-fetch';
import {Client} from 'pg';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

const {version: packageVersion} = require('../../../package.json');
const META_JSON_FIELDS = ['deployments'];
const METADATA_TYPES = {
  lastProcessedHeight: 'number',
  lastProcessedTimestamp: 'number',
  targetHeight: 'number',
  lastFinalizedVerifiedHeight: 'number',
  unfinalizedBlocks: 'string',
  chain: 'string',
  specName: 'string',
  genesisHash: 'string',
  indexerHealthy: 'boolean',
  indexerNodeVersion: 'string',
  queryNodeVersion: 'string',
  dynamicDatasources: 'object',
  startHeight: 'number',
  evmChainId: 'string',
  deployments: 'string',
  lastCreatedPoiHeight: 'number',
  latestSyncedPoiHeight: 'number',
  dbSize: 'string',
};

const METADATA_KEYS = Object.keys(METADATA_TYPES);

type MetaType = number | string | boolean;

type MetaEntry = {key: string; value: MetaType};

type MetadatasConnection = {
  totalCount?: number;
  nodes?: MetaData[];
  // edges?: any; // TODO
};

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
  } catch (e: any) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer meta, `, e.message);
  }

  try {
    health = await fetch(new URL(`health`, indexerUrl));
    metaCache.indexerHealthy = !!health.ok;
  } catch (e: any) {
    metaCache.indexerHealthy = false;
    console.warn(`Failed to fetch indexer health, `, e.message);
  }
}

function matchMetadataTableName(name: string): boolean {
  return METADATA_REGEX.test(name) || MULTI_METADATA_REGEX.test(name);
}

async function fetchMetadataFromTable(
  pgClient: Client,
  schemaName: string,
  tableName: string,
  useRowEst: boolean
): Promise<MetaData> {
  const {rows} = await pgClient.query(`select * from "${schemaName}".${tableName} WHERE key = ANY ($1)`, [
    METADATA_KEYS,
  ]);

  const dbKeyValue = rows.reduce((array: MetaEntry[], curr: MetaEntry) => {
    array[curr.key] = curr.value;
    return array;
  }, {}) as {[key: string]: MetaType};

  const metadata = {} as MetaData;

  for (const key in METADATA_TYPES) {
    if (typeof dbKeyValue[key] === METADATA_TYPES[key]) {
      //JSON object are stored in string type, filter here and parse
      if (META_JSON_FIELDS.includes(key)) {
        metadata[key] = JSON.parse(dbKeyValue[key].toString());
      } else {
        metadata[key] = dbKeyValue[key];
      }
    }
  }
  metadata.queryNodeVersion = packageVersion;

  if (useRowEst) {
    const tableEstimates = await pgClient
      .query<TableEstimate>(
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
  }

  return metadata;
}

// Store default metadata name in table avoid query system table
let defaultMetadataName: string;

async function fetchFromTable(
  pgClient: Client,
  schemaName: string,
  chainId: string | undefined,
  useRowEst: boolean
): Promise<MetaData> {
  let metadataTableName: string;

  if (!chainId) {
    // return first metadata entry you find.
    if (defaultMetadataName === undefined) {
      const {rows} = await pgClient.query(
        `SELECT table_name FROM information_schema.tables where table_schema='${schemaName}'`
      );
      const {table_name} = rows.find((obj: {table_name: string}) => matchMetadataTableName(obj.table_name));
      defaultMetadataName = table_name;
    }
    metadataTableName = defaultMetadataName;
  } else {
    metadataTableName = getMetadataTableName(chainId);
  }

  return fetchMetadataFromTable(pgClient, schemaName, metadataTableName, useRowEst);
}

function metadataTableSearch(build: Build): boolean {
  return !!(build.pgIntrospectionResultsByKind as PgIntrospectionResultsByKind).attribute.find((attr) =>
    matchMetadataTableName(attr.class.name)
  );
}

function isFieldNode(node: SelectionNode): node is FieldNode {
  return node.kind === 'Field';
}

/* Recursively work down the AST to find a node with a matching path */
function findNodePath(nodes: readonly SelectionNode[], path: string[]): FieldNode | undefined {
  if (!path.length) {
    throw new Error('Path must have a length');
  }

  const currentPath = path[0];
  const found = nodes.find((node) => isFieldNode(node) && node.name.value === currentPath);

  if (found && isFieldNode(found)) {
    const newPath = path.slice(1);

    if (!newPath.length) return found;

    if (!found.selectionSet) return;
    return findNodePath(found.selectionSet.selections, newPath);
  }
}

export const GetMetadataPlugin = makeExtendSchemaPlugin((build: Build, options) => {
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
        startHeight: Int
        indexerHealthy: Boolean
        indexerNodeVersion: String
        queryNodeVersion: String
        rowCountEstimate: [TableEstimate]
        dynamicDatasources: [JSON]
        evmChainId: String
        deployments: JSON
        lastFinalizedVerifiedHeight: Int
        unfinalizedBlocks: String
        lastCreatedPoiHeight: Int
        latestSyncedPoiHeight: Int
        dbSize: BigInt
      }

      type _MetadatasEdge {
        cursor: Cursor
        node: _Metadata
      }

      type _Metadatas {
        totalCount: Int!
        nodes: [_Metadata]!
        # edges: [_MetadatasEdge]
      }

      extend type Query {
        _metadata(chainId: String): _Metadata

        _metadatas(
          after: Cursor
          before: Cursor # distinct: [_mmr_distinct_enum] = null # filter: _MetadataFilter # first: Int # offset: Int
        ): # last: Int
        # orderBy: [_MetadatasOrderBy!] = [PRIMARY_KEY_ASC]
        _Metadatas
      }
    `,
    resolvers: {
      Query: {
        _metadata: async (_parentObject, args, context, info): Promise<MetaData | undefined> => {
          const tableExists = metadataTableSearch(build);
          if (tableExists) {
            let rowCountFound = false;
            if (info.fieldName === '_metadata') {
              rowCountFound = !!findNodePath(info.fieldNodes, ['_metadata', 'rowCountEstimate']);
            }
            const metadata = await fetchFromTable(context.pgClient, schemaName, args.chainId, rowCountFound);
            if (Object.keys(metadata).length > 0) {
              return metadata;
            }
          }
          if (argv(`indexer`)) {
            return metaCache;
          }
          return;
        },
        _metadatas: async (_parentObject, args, context, info): Promise<MetadatasConnection> => {
          const tableNames = uniq<string>(
            (build.pgIntrospectionResultsByKind as PgIntrospectionResultsByKind).attribute
              .filter((attr) => attr.class.namespaceName === schemaName && matchMetadataTableName(attr.class.name))
              .map((attr) => attr.class.name)
          );

          let totalCount = false;
          let rowCountEstimate = false;

          if (info.fieldName === '_metadatas') {
            totalCount = !!findNodePath(info.fieldNodes, ['_metadatas', 'totalCount']);
            rowCountEstimate = !!findNodePath(info.fieldNodes, ['_metadatas', 'nodes', 'rowCountEstimate']);
          }

          const metadatas = await Promise.all(
            tableNames.map((name) => fetchMetadataFromTable(context.pgClient, schemaName, name, rowCountEstimate))
          );

          return {
            totalCount: totalCount ? tableNames.length : undefined,
            nodes: metadatas,
          };
        },
      },
    },
  };
});
