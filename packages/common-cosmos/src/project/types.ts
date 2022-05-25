// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlCosmosDatasource} from '@subql/types-cosmos';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlCosmosRuntimeHandler,
  SubqlCosmosCustomHandler,
  SubqlCosmosHandler,
  SubqlCosmosHandlerKind,
  SubqlCosmosDatasource as SubqlCosmosDataSource,
  SubqlCosmosCustomDatasource as SubqlCosmosCustomDataSource,
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
