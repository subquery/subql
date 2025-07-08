// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProjectNetworkConfig, RunnerSpecs} from '@subql/types-core';
import {z} from 'zod';
import {DEFAULT_DEPLOYMENT_TYPE} from './constants';

export interface ProjectSpecBase {
  name: string;
  author: string;
  description?: string;
  endpoint: ProjectNetworkConfig['endpoint'];
}

export interface QueryAdvancedOpts {
  unsafe?: boolean;
  subscription?: boolean;
  queryTimeout?: number;
  maxConnection?: number;
  queryLimit?: number;
  aggregate?: boolean;
}

export const IndexerAdvancedOptsSchema = z.object({
  unsafe: z.boolean().optional(),
  batchSize: z.number().optional(),
  subscription: z.boolean().optional(),
  historicalData: z.boolean().optional(),
  unfinalizedBlocks: z.boolean().optional(),
  proofOfIndex: z.boolean().optional(),
  storeCacheThreshold: z.number().optional(),
  disableStoreCacheAsync: z.boolean().optional(),
});
export type IndexerAdvancedOpts = z.infer<typeof IndexerAdvancedOptsSchema>;

export type ProjectSpecV0_0_1 = ProjectSpecBase;

export interface ProjectSpecV1_0_0 extends ProjectSpecBase {
  chainId: string;
  runner: RunnerSpecs;
}

export interface ProjectSpecV0_2_0 extends ProjectSpecBase {
  genesisHash: string;
}

export function isProjectSpecV0_2_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_2_0 {
  return !!(projectSpec as ProjectSpecV0_2_0).genesisHash;
}

export function isProjectSpecV1_0_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV1_0_0 {
  return !!(projectSpec as ProjectSpecV1_0_0).chainId;
}

export interface ValidateDataType {
  valid: boolean;
  manifestFile: string | null;
  chainId: string | null;
  runner?: RunnerSpecs | null;
  manifestRunner?: RunnerSpecs | null;
  errorMessage?: string;
}

export interface CreateProject {
  key: string;
  name: string;
  subtitle?: string;
  description?: string;
  logoUrl?: string;
  apiVersion: 'v2' | 'v3';
  type: 1 | 2 | 3; // MS | NETWORK | SUBGRAPH
  tag: string[];
  hide?: boolean;
  dedicateDBKey?: string;
}

export const DeploymentDataTypeSchema = z.object({
  projectKey: z.string(),
  version: z.string(),
  status: z.string(),
  indexerImage: z.string(),
  queryImage: z.string(),
  endpoint: z.string(),
  dictEndpoint: z.string(),
  type: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  id: z.number(),
  subFolder: z.string(),
  queryUrl: z.string(),
  configuration: z.object({
    config: z.object({
      query: z.record(z.string(), z.unknown()),
      indexer: IndexerAdvancedOptsSchema,
      role: z.string(),
      chainId: z.string(),
    }),
  }),
});
export type DeploymentDataType = z.infer<typeof DeploymentDataTypeSchema>;

export interface ProjectDataType {
  createdAt: string;
  updatedAt: string;
  id: number;
  projectKey: string;
  version: string;
  status: string;
  cluster: string;
  indexerImage: string;
  queryImage: string;
  subFolder: string;
  endpoint: string;
  dictEndpoint: string;
  type: string;
  queryUrl: string;
  configuration: {
    config: {
      query: unknown;
      indexer: unknown;
    };
  };
  role: string;
  chainId: string;
  apiVersion: string;
}

export interface V3DeploymentInput {
  cid: string;
  type: DeploymentType;
  queryImageVersion: string;
  queryAdvancedSettings: {
    query: QueryAdvancedOpts;
  };
  chains: V3DeploymentIndexerType[];
}

export interface V3DeploymentIndexerType {
  cid: string;
  dictEndpoint?: string;
  endpoint: string | string[];
  indexerImageVersion: string;
  indexerAdvancedSettings: {
    indexer: IndexerAdvancedOpts;
  };
  extraParams?: {
    workers?: {
      num?: number;
    };
  };
}

export interface MultichainDataFieldType {
  [key: string]: string;
}

export interface ProjectDeploymentInterface {
  chains: V3DeploymentIndexerType[];
  projectInfo?: ProjectDataType;
  flags: DeploymentFlagsInterface;
  ipfsCID: string;
  authToken: string;
}

export const DeploymentTypeSchema = z.enum(['primary', 'stage']);
export type DeploymentType = z.infer<typeof DeploymentTypeSchema>;

export const DeploymentOptions = z.object({
  org: z.string({description: 'The Github organization name'}),
  projectName: z.string({description: 'Project name'}),
  type: DeploymentTypeSchema.default(DEFAULT_DEPLOYMENT_TYPE),
  indexerVersion: z.string({description: 'Indexer image version'}).optional(),
  queryVersion: z.string({description: 'Query image version'}).optional(),
  dict: z.string({description: 'A dictionary endpoint for this projects network'}).optional(),
  endpoint: z.string({description: 'The RPC endpoint to be used by the project'}).optional(),

  // Indexer flags
  indexerUnsafe: z
    .boolean({description: 'Run the indexer in unsafe mode, this will disable some checks'})
    .optional()
    .default(false),
  indexerBatchSize: z.number({description: 'The batch size for the indexer'}).optional().default(30),
  indexerSubscription: z.boolean({description: 'Enable subscription for the indexer'}).optional().default(false),
  disableHistorical: z.boolean({description: 'Disable historical data indexing'}).optional().default(false),
  indexerUnfinalized: z.boolean({description: 'Enable unfinalized blocks indexing'}).optional().default(false),
  indexerStoreCacheThreshold: z
    .number({description: 'The number of items kept in the cache before flushing'})
    .optional(),
  disableIndexerStoreCacheAsync: z.boolean({description: 'Disable async store cache'}).optional().default(false),
  indexerWorkers: z.number({description: 'The number of workers for the indexer'}).optional(),

  // Query flags
  queryUnsafe: z
    .boolean({description: 'Run the query in unsafe mode, this will disable some checks'})
    .optional()
    .default(false),
  querySubscription: z.boolean({description: 'Enable subscription queries'}).optional().default(false),
  queryTimeout: z.number({description: 'The timeout for the query'}).optional(),
  queryMaxConnection: z.number({description: 'The maximum number of connections for the query'}).optional(),
  queryAggregate: z.boolean({description: 'Enable aggregate queries'}).optional().default(false),
  queryLimit: z.number({description: 'The maximum number of results for the query'}).optional(),

  useDefaults: z
    .boolean({description: 'Use default values for indexerVersion, queryVersion, dictionary, endpoint'})
    .optional()
    .default(true),
});
export type DeploymentFlagsInterface = z.infer<typeof DeploymentOptions>;

export interface GenerateDeploymentChainInterface {
  cid: string;
  dictEndpoint?: string;
  endpoint: string[];
  indexerImageVersion: string;
  flags: DeploymentFlagsInterface;
}
