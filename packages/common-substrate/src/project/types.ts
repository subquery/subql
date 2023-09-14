// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SubstrateDatasource} from '@subql/types';
import {IProjectManifest, ProjectNetworkConfig} from '@subql/types-core';

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
  SubstrateRuntimeHandlerFilter,
  SubstrateDatasourceKind,
  RuntimeHandlerInputMap as SubstrateRuntimeHandlerInputMap,
} from '@subql/types';

//make exception for runtime datasource 0.0.1
export type ISubstrateProjectManifest = IProjectManifest<SubstrateDatasource>;

export interface SubstrateProjectNetworkConfig extends ProjectNetworkConfig {
  /**
   * The hash of the chains first block
   * @deprecated Use `chainId` instead
   * @type {string}
   * */
  genesisHash?: string;
  /**
   * The identity of the chain. In this case the hash of the chains first block
   * @type {string}
   * */
  chainId?: string;
}
