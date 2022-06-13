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

export type ProjectSpecV0_0_1 = ProjectSpecBase;

export interface ProjectSpecV1_0_0 extends ProjectSpecBase {
  chainId: string;
  runner: RunnerSpecs;
}

export interface ProjectSpecV0_2_0 extends ProjectSpecBase {
  genesisHash: string;
}

export interface TerraProjectSpecV0_3_0 extends ProjectSpecBase {
  chainId: string;
}

export function isProjectSpecV0_0_1(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_0_1 {
  return !(isProjectSpecV0_2_0(projectSpec) || isTerraProjectSpecV0_3_0(projectSpec));
}

export function isProjectSpecV0_2_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_2_0 {
  return !!(projectSpec as ProjectSpecV0_2_0).genesisHash;
}

export function isProjectSpecV1_0_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV1_0_0 {
  return !!(projectSpec as ProjectSpecV1_0_0).chainId;
}

export function isTerraProjectSpecV0_3_0(projectSpec: ProjectSpecBase): projectSpec is TerraProjectSpecV0_3_0 {
  return !!(projectSpec as TerraProjectSpecV0_3_0).chainId;
}

export interface validateDataType {
  valid: boolean;
  manifestFile: string | null;
  chainId: string | null;
  runner: RunnerSpecs | null;
  errorMessage?: string;
}

export interface deploymentSpec {
  org: string;
  project_name: string;
  repository: string;
  ipfs: string;
  subtitle: string;
  description: string;
  logoURl: string;
  apiVersion: string;
}
export interface deploymentDataType {
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
