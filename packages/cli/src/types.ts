// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RunnerSpecs} from '@subql/common';

export interface ProjectSpecBase {
  name: string;
  repository?: string;
  author: string;
  description?: string;
  version: string;
  license: string;
  endpoint: string;
}

export interface QueryAdvancedOpts {
  unsafe?: boolean | undefined;
  subscription?: boolean | undefined;
  queryTimeout?: number | undefined;
  maxConnection?: number | undefined;
  Aggregate?: boolean | undefined;
}
export interface IndexerAdvancedOpts {
  unsafe?: boolean | undefined;
  batchSize?: number | undefined;
  subscription?: boolean | undefined;
  historicalData?: boolean | undefined;
  workers?: number | undefined;
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

export interface DeploymentSpec {
  org: string;
  projectName: string;
  repository: string;
  ipfs: string;
  subtitle: string;
  description: string;
  logoURl: string;
  apiVersion: string;
  type: string;
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
      indexer: {
        batchSize: number;
      };
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
      query: {};
      indexer: {};
    };
  };
  role: string;
  chainId: string;
  apiVersion: string;
}
