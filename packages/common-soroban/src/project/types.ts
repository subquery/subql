// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlDatasource} from '@subql/types-soroban';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlSorobanProcessorOptions,
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  SorobanHandlerKind,
  SubqlDatasource as SubqlSorobanDataSource,
  SubqlCustomDatasource as SubqlSorobanCustomDataSource,
  SorobanEventFilter,
  SubqlDatasourceProcessor,
  SubqlHandlerFilter,
  SorobanDatasourceKind,
  SorobanRuntimeHandlerInputMap as SorobanRuntimeHandlerInputMap,
} from '@subql/types-soroban';

export type ISorobanProjectManifest = IProjectManifest<SubqlDatasource>;

export interface SorobanProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
  chainId?: string;
}
