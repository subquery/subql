// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/types-core';
import {CosmosDatasource, CustomModule} from '@subql/types-cosmos';
import {Root} from 'protobufjs';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  CosmosRuntimeHandler,
  CosmosCustomHandler,
  CosmosHandler,
  CosmosHandlerKind,
  CosmosDatasource as CosmosDataSource,
  CosmosBlockFilter,
  CosmosMessageFilter,
  CosmosEventFilter,
  CosmosDatasourceProcessor,
  CosmosHandlerFilter,
  CosmosDatasourceKind,
  CosmosRuntimeHandlerInputMap as CosmosRuntimeHandlerInputMap,
} from '@subql/types-cosmos';

export type ICosmosProjectManifest = IProjectManifest<CosmosDatasource>;

export interface CosmosProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
}

export type CosmosChainType = CustomModule & {
  proto: Root;
  packageName?: string;
};

export type CosmosProjectNetConfig = CosmosProjectNetworkConfig & {
  chainId: string;
  chaintypes: Map<string, CosmosChainType> & {protoRoot: protobuf.Root};
};
