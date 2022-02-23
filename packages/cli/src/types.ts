// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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

export interface ProjectSpecV0_2_0 extends ProjectSpecBase {
  genesisHash: string;
}

export interface ProjectSpecV0_3_0 extends ProjectSpecV0_2_0 {
  connectionChain: string;
}

export function isProjectSpecV0_0_1(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_0_1 {
  return !isProjectSpecV0_2_0(projectSpec);
}

export function isProjectSpecV0_2_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_2_0 {
  return !!(projectSpec as ProjectSpecV0_2_0).genesisHash;
}

export function isProjectSpecV0_3_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_3_0 {
  return !!(projectSpec as ProjectSpecV0_3_0).connectionChain;
}
