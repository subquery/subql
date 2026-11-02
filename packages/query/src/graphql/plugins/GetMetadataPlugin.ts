// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getMetadataTableName, MetaData, METADATA_REGEX, MULTI_METADATA_REGEX, TableEstimate} from '@subql/utils';
import {FieldNode, SelectionNode} from 'graphql';
import {uniq} from 'lodash';
import {extendSchema, gql} from 'postgraphile/utils';
import {setAsyncInterval} from '../../utils/asyncInterval';
import {argv} from '../../yargs';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {version: packageVersion} = require('../../../package.json');
const META_JSON_FIELDS = ['deployments'];
const METADATA_TYPES: Record<string, string> = {
  lastProcessedHeight: 'number',
  lastProcessedBlockTimestamp: 'number',
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
  historicalStateEnabled: 'string',
};

const METADATA_KEYS = Object.keys(METADATA_TYPES);

type MetaType = number | string | boolean;
type MetaEntry = {key: string; value: MetaType};

const metaCache: Record<string, any> = {
  queryNodeVersion: packageVersion,
};

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
  pgClient: {query: (opts: {text: string; values?: any[]}) => Promise<{rows: any[]}>},
  schemaName: string,
  tableName: string,
  useRowEst: boolean
): Promise<MetaData> {
  const {rows} = await pgClient.query({
    text: `select * from "${schemaName}".${tableName} WHERE key = ANY ($1)`,
    values: [METADATA_KEYS],
  });

  const dbKeyValue = rows.reduce((array: MetaEntry[], curr: MetaEntry) => {
    (array as any)[curr.key] = curr.value;
    return array;
  }, []) as {[key: string]: MetaType};

  const metadata = {} as MetaData;

  for (const key in METADATA_TYPES) {
    if (typeof dbKeyValue[key] === METADATA_TYPES[key]) {
      if (META_JSON_FIELDS.includes(key)) {
        try {
          metadata[key] = JSON.parse(dbKeyValue[key].toString());
        } catch {
          console.warn(`GetMetadataPlugin: failed to parse JSON for key "${key}"`);
          metadata[key] = undefined;
        }
      } else {
        metadata[key] = dbKeyValue[key];
      }
    } else if (dbKeyValue[key] !== undefined && dbKeyValue[key] !== null) {
      console.warn(
        `GetMetadataPlugin: type mismatch for key "${key}" — expected ${METADATA_TYPES[key]}, got ${typeof dbKeyValue[key]}`
      );
    }
  }
  metadata.queryNodeVersion = packageVersion;

  if (useRowEst) {
    const tableEstimates = await pgClient
      .query({
        text: `select relname as table , reltuples::bigint as estimate from pg_class
      where relnamespace in
            (select oid from pg_namespace where nspname = $1)
      and relname in
          (select table_name from information_schema.tables
           where table_schema = $1)`,
        values: [schemaName],
      })
      .catch((e) => {
        throw new Error(`Unable to estimate table row count: ${e}`);
      });
    metadata.rowCountEstimate = tableEstimates.rows;
  }

  return metadata;
}

let defaultMetadataName: string;

async function fetchFromTable(
  pgClient: {query: (opts: {text: string; values?: any[]}) => Promise<{rows: any[]}>},
  schemaName: string,
  chainId: string | undefined,
  useRowEst: boolean
): Promise<MetaData> {
  let metadataTableName: string;

  if (!chainId) {
    if (defaultMetadataName === undefined) {
      const {rows} = await pgClient.query({
        text: `SELECT table_name FROM information_schema.tables where table_schema='${schemaName}'`,
      });
      const {table_name} = rows.find((obj: {table_name: string}) => matchMetadataTableName(obj.table_name));
      defaultMetadataName = table_name;
    }
    metadataTableName = defaultMetadataName;
  } else {
    metadataTableName = getMetadataTableName(chainId);
  }

  return fetchMetadataFromTable(pgClient, schemaName, metadataTableName, useRowEst);
}

function metadataTableSearch(build: any): boolean {
  const pgRegistry = build?.input?.pgRegistry;
  if (!pgRegistry) return false;
  const resources = Object.values(pgRegistry.pgResources) as any[];
  return resources.some((r: any) => matchMetadataTableName(r.name));
}

function isFieldNode(node: SelectionNode): node is FieldNode {
  return node.kind === 'Field';
}

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

export const GetMetadataPlugin = extendSchema((build: any) => {
  // Get the schema name from the first pgService's pgResource, fallback to 'subquery_1'
  const pgRegistry = build?.input?.pgRegistry;
  const resources = Object.values(pgRegistry?.pgResources || {}) as any[];
  // In v5, resources don't have a `namespace` property; extract schema name from `from` SQL text
  const firstResource = resources[0];
  let schemaName = 'subquery_1';
  if (firstResource) {
    const fromText = (firstResource as any).from?.t;
    const schemaMatch = typeof fromText === 'string' && fromText.match(/^"([^"]+)"/);
    if (schemaMatch) {
      schemaName = schemaMatch[1];
    }
  }

  if (argv('indexer')) {
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
      }

      extend type Query {
        _metadata(chainId: String): _Metadata
        _metadatas(chainId: String): _Metadatas
      }
    `,
    resolvers: {
      Query: {
        _metadata: ($root: any, args: any, context: any, info: any) => {
          const tableExists = metadataTableSearch(build);
          if (tableExists) {
            let rowCountFound = false;
            if (info && info.fieldName === '_metadata') {
              rowCountFound = !!findNodePath(info.fieldNodes, ['_metadata', 'rowCountEstimate']);
            }
            return resolvePgClient(context, async (pgClient) => {
              const metadata = await fetchFromTable(pgClient, schemaName, args.chainId, rowCountFound);
              if (Object.keys(metadata).length > 0) {
                return metadata;
              }
              if (argv('indexer')) {
                return metaCache;
              }
              return undefined;
            });
          }
          if (argv('indexer')) {
            return metaCache;
          }
          return undefined;
        },
        _metadatas: ($root: any, args: any, context: any, info: any) => {
          const pgRegistry = build?.input?.pgRegistry;
          const resources = Object.values(pgRegistry?.pgResources || []) as any[];
          const tableNames = uniq<string>(
            resources
              .filter((r: any) => {
                // v5 resources don't have `namespace`; extract schema from `from` SQL text
                const fromText = r.from?.t;
                const rSchema = typeof fromText === 'string' ? fromText.match(/^"([^"]+)"/)?.[1] : undefined;
                return rSchema === schemaName && matchMetadataTableName(r.name);
              })
              .map((r: any) => r.name)
          );

          let totalCount = false;
          let rowCountEstimate = false;

          if (info.fieldName === '_metadatas') {
            totalCount = !!findNodePath(info.fieldNodes, ['_metadatas', 'totalCount']);
            rowCountEstimate = !!findNodePath(info.fieldNodes, ['_metadatas', 'nodes', 'rowCountEstimate']);
          }

          return resolvePgClient(context, async (pgClient) => {
            const metadatas = await Promise.all(
              tableNames.map((name) => fetchMetadataFromTable(pgClient, schemaName, name, rowCountEstimate))
            );
            return {
              totalCount: totalCount ? tableNames.length : undefined,
              nodes: metadatas,
            };
          });
        },
      },
    },
  };
}, 'GetMetadataPlugin');

// Helper to obtain a pgClient from context (v5 compat).
// In v5 with the /v4 Express adapter, context.pgClient is available directly.
// If not provided, the callback is skipped (returns undefined).
async function resolvePgClient(context: any, fn: (pgClient: any) => Promise<any>): Promise<any> {
  const pgClient = context?.pgClient;
  if (!pgClient) {
    // No pgClient in context — cannot execute query
    return undefined;
  }
  return fn(pgClient);
}
