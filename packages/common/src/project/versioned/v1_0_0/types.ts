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
  skipBlock?: boolean;
}

export interface ParentProject {
  // The block height to switch from the parent project to this project
  block: number;

  // The IPFS CID to the parent project
  reference: string;
}

export type TemplateBaseDs<DS extends BaseDataSource = BaseDataSource> = Omit<DS, 'startBlock'> & TemplateBase;

export interface ProjectManifestV1_0_0<
  D extends BaseDataSource = BaseDataSource,
  T extends TemplateBaseDs<D> = TemplateBaseDs<D>
> extends Omit<ProjectManifestV0_2_1<T, D>, 'network'> {
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
  parent?: ParentProject;
}

export interface BlockFilter {
  modulo?: number;
  timestamp?: string;
  height?: number;
}
