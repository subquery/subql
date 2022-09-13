// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlDatasource} from '@subql/types-avalanche';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  AvalancheHandlerKind,
  SubqlDatasource as SubqlAvalancheDataSource,
  SubqlCustomDatasource as SubqlAvalancheCustomDataSource,
  AvalancheBlockFilter,
  AvalancheTransactionFilter,
  AvalancheLogFilter,
  SubqlDatasourceProcessor,
  SubqlHandlerFilter,
  AvalancheDatasourceKind,
  AvalancheRuntimeHandlerInputMap as AvalancheRuntimeHandlerInputMap,
} from '@subql/types-avalanche';

export type IAvalancheProjectManifest = IProjectManifest<SubqlDatasource>;

export interface AvalancheProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
  chainId?: string;
  subnet?: string;
}
