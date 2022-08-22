// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {TemplateBase, BaseHandler} from '../project/versioned';

export interface IProjectManifest<D> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: D[];
  toDeployment(): string;
  validate(): void;
}

export interface GenericManifest<H, N> {
  name: string;
  version: string;
  network: N;
  specVersion: string;
  description: string;
  repository: string;
  dataSources: GenericDataSource<H>[];
  //undefined for GenericManifest
  toDeployment(): string | undefined;
  validate(): void;
}

export type GenericHandler = BaseHandler<any>;

export interface GenericDataSource<H extends Partial<GenericHandler>, O = any> {
  name?: string;
  kind: string;
  mapping: GenericMapping<H>;
  // filter?: F; Abandon after project manifest 0.0.1
  startBlock?: number;
  assets?: Map<string, FileReference>;
  processor?: Processor<O>;
  options?: Record<string, unknown>;
}

export class GenericMapping<H> {
  file: string;
  handlers: H[];
}

export interface GenericNetworkConfig {
  endpoint?: string;
  dictionary?: string;
  chainId?: string;
  genesisHash?: string;
  chaintypes?: FileReference;
}

export interface ProjectNetworkConfig {
  endpoint?: string;
  dictionary?: string;
  //genesisHash?: string;
}

export interface FileReference {
  file: string;
}

export type Processor<O = any> = FileReference & {options?: O};

export interface GenericTemplate<H = Partial<GenericHandler>, O = any>
  extends Omit<GenericDataSource<H, O>, 'name'>,
    TemplateBase {}
