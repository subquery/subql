// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/types-core';
import {SubqlCosmosDatasource, CustomModule} from '@subql/types-cosmos';
import {Root} from 'protobufjs';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlCosmosRuntimeHandler,
  SubqlCosmosCustomHandler,
  SubqlCosmosHandler,
  SubqlCosmosHandlerKind,
  SubqlCosmosDatasource as SubqlCosmosDataSource,
  SubqlCosmosBlockFilter,
  SubqlCosmosMessageFilter,
  SubqlCosmosEventFilter,
  SubqlCosmosDatasourceProcessor,
  SubqlCosmosHandlerFilter,
  SubqlCosmosDatasourceKind,
  CosmosRuntimeHandlerInputMap as CosmosRuntimeHandlerInputMap,
} from '@subql/types-cosmos';

export type ICosmosProjectManifest = IProjectManifest<SubqlCosmosDatasource>;

export interface CosmosProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
}

export type CosmosChainType = CustomModule & {
  proto: Root;
  packageName?: string;
};

export type CosmosProjectNetConfig = CosmosProjectNetworkConfig & {
  chainId: string;
  chainTypes: Map<string, CosmosChainType> & {protoRoot: protobuf.Root};
};
