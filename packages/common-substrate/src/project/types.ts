// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubstrateDatasource} from '@subql/types';
import {RuntimeDataSourceV0_0_1} from '../project/versioned/v0_0_1';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubstrateRuntimeHandler,
  SubstrateCustomHandler,
  SubstrateHandler,
  SubstrateHandlerKind,
  SubstrateDatasource as SubstrateDataSource,
  SubstrateCustomDatasource as SubstrateCustomDataSource,
  SubstrateBlockFilter,
  SubstrateCallFilter,
  SubstrateEventFilter,
  SubstrateDatasourceProcessor,
  SubstrateNetworkFilter,
  SubstrateRuntimeHandlerFilter,
  SubstrateDatasourceKind,
  RuntimeHandlerInputMap as SubstrateRuntimeHandlerInputMap,
} from '@subql/types';

//make exception for runtime datasource 0.0.1
export type ISubstrateProjectManifest = IProjectManifest<SubstrateDatasource | RuntimeDataSourceV0_0_1>;

export interface SubstrateProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
  chainId?: string;
}
