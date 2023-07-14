// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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

export enum SubqlSorobanHandlerKind {
  SorobanEvent = 'soroban/EventHandler',
}

export enum SubqlSorobanDatasourceKind {
  SorobanRuntime = 'Soroban/Runtime',
}
