// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  CustomDataSourceAsset,
  Processor,
  SubstrateCustomHandler,
  SubstrateMapping,
  SubstrateNetworkFilter,
} from '@subql/types';

export interface IProjectManifest<D> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: D[];
  toDeployment(): string;
  validate(): void;
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  //genesisHash?: string;
}

export interface FileReference {
  file: string;
}

export type GenericProjectManifest = Omit<IProjectManifest<GenericDatasource>, 'toDeployment'>;

export interface GenericDatasource<
  K extends string = string,
  T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
  M extends SubstrateMapping = SubstrateMapping<SubstrateCustomHandler>,
  O = any,
  F extends SubstrateNetworkFilter = SubstrateNetworkFilter
> {
  kind: K;
  assets?: Map<string, CustomDataSourceAsset>;
  processor?: Processor<O>;
  name?: string;
  filter?: F;
  startBlock?: number;
  mapping: M;
}
