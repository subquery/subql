// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/types-core';
import {SubqlDatasource} from '@subql/types-stellar';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlStellarProcessorOptions,
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  StellarHandlerKind,
  SubqlDatasource as SubqlStellarDataSource,
  SubqlCustomDatasource as SubqlStellarCustomDataSource,
  StellarBlockFilter,
  StellarTransactionFilter,
  StellarOperationFilter,
  StellarEffectFilter,
  SubqlDatasourceProcessor,
  SubqlHandlerFilter,
  StellarDatasourceKind,
  StellarRuntimeHandlerInputMap as StellarRuntimeHandlerInputMap,
} from '@subql/types-stellar';

export type IStellarProjectManifest = IProjectManifest<SubqlDatasource>;

export interface StellarProjectNetworkConfig extends ProjectNetworkConfig {
  chainId: string;
  sorobanEndpoint: string;
}
