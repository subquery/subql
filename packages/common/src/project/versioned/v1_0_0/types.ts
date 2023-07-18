// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '../base';
import {ProjectManifestV0_2_1, TemplateBase} from '../v0_2_1';

export interface RunnerSpecs {
  node: NodeSpec;
  query: QuerySpec;
}

export interface NodeSpec {
  name: string;
  version: string;
  options?: NodeOptions;
}

export interface QuerySpec {
  name: string;
  version: string;
}

export interface NodeOptions {
  historical?: boolean;
  unsafe?: boolean;
  unfinalizedBlocks?: boolean;
}

export interface ProjectManifestV1_0_0<T extends object = TemplateBase, D extends object = BaseDataSource>
  extends Omit<ProjectManifestV0_2_1<T, D>, 'network'> {
  dataSources: D[];
  runner: RunnerSpecs;
  templates?: T[];
  network: {
    chainId: string;
    endpoint?: string | string[];
    dictionary?: string;
    bypassBlocks?: (number | string)[];
    chaintypes?: {
      file: string;
    };
  };
}
