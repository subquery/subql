// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface ProjectSpecBase {
  name: string;
  repository?: string;
  author: string;
  description?: string;
  version: string;
  license: string;
}

export interface ProjectSpecV0_0_1 extends ProjectSpecBase {
  endpoint: string;
}

export interface ProjectSpecV0_2_0 extends ProjectSpecBase {
  genesisHash: string;
}

export function isProjectSpecV0_0_1(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_0_1 {
  return !!(projectSpec as ProjectSpecV0_0_1).endpoint;
}

export function isProjectSpecV0_2_0(projectSpec: ProjectSpecBase): projectSpec is ProjectSpecV0_2_0 {
  return !!(projectSpec as ProjectSpecV0_2_0).genesisHash;
}
