// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_1} from '../v0_2_1';

export enum nodeKind {
  Substrate = '@subql/node',
  Terra = '@subql/node-terra',
}

export enum queryKind {
  Default = '@subql/query',
}

export interface runnerSpecs {
  node: nodeSpec;
  query: querySpec;
}

export interface nodeSpec {
  name: nodeKind;
  version: string;
}

export interface querySpec {
  name: queryKind;
  version: string;
}

export interface ProjectManifestV1_0_0 extends ProjectManifestV0_2_1 {
  runner: runnerSpecs;
}
