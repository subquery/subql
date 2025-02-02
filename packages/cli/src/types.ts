// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProjectNetworkConfig, RunnerSpecs} from '@subql/types-core';

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
export interface IndexerAdvancedOpts {
  unsafe?: boolean;
  batchSize?: number;
  subscription?: boolean;
  historicalData?: boolean;
  unfinalizedBlocks?: boolean;
  proofOfIndex?: boolean;
  storeCacheThreshold?: number;
  disableStoreCacheAsync?: boolean;
}

export type ProjectSpecV0_0_1 = ProjectSpecBase;

export interface ProjectSpecV1_0_0 extends ProjectSpecBase {
  chainId: string;
  runner: RunnerSpecs;
}

export interface ProjectSpecV0_2_0 extends ProjectSpecBase {
  genesisHash: string;
}

export function isProjectSpecV0_0_1(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_0_1 {
  return !isProjectSpecV0_2_0(projectSpec);
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
export interface DeploymentDataType {
  projectKey: string;
  version: string;
  status: string;
  indexerImage: string;
  queryImage: string;
  endpoint: string;
  dictEndpoint: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  id: number;
  subFolder: string;
  queryUrl: string;
  configuration: {
    config: {
      query: Record<string, unknown>;
      indexer: IndexerAdvancedOpts;
      role: string;
      chainId: string;
    };
  };
}

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

export type DeploymentType = 'primary' | 'stage';

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
  org: string;
  projectName: string;
  chains: V3DeploymentIndexerType[];
  projectInfo?: ProjectDataType;
  flags: DeploymentFlagsInterface;
  ipfsCID: string;
  queryVersion: string;
  authToken: string;
  log: any;
}

export interface DeploymentFlagsInterface {
  ipfs?: string;
  org?: string;
  projectName?: string;
  type: DeploymentType;
  indexerVersion?: string;
  queryVersion?: string;
  dict?: string;
  endpoint?: string;
  indexerUnsafe: boolean;
  indexerBatchSize?: number;
  indexerSubscription: boolean;
  disableHistorical: boolean;
  indexerUnfinalized: boolean;
  indexerStoreCacheThreshold?: number;
  disableIndexerStoreCacheAsync: boolean;
  indexerWorkers?: number;
  ipfsCID?: string;
  location?: string;
  queryUnsafe: boolean;
  querySubscription: boolean;
  queryTimeout?: number;
  queryMaxConnection?: number;
  queryAggregate: boolean;
  queryLimit?: number;
  useDefaults: boolean;
}

export interface GenerateDeploymentChainInterface {
  cid: string;
  dictEndpoint?: string;
  endpoint: string[];
  indexerImageVersion: string;
  flags: DeploymentFlagsInterface;
}
