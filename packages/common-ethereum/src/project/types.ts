// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlDatasource} from '@subql/types-ethereum';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlDatasource as SubqlEthereumDataSource,
  SubqlCustomDatasource as SubqlEthereumCustomDataSource,
  EthereumBlockFilter,
  EthereumTransactionFilter,
  EthereumLogFilter,
  SubqlDatasourceProcessor,
  SubqlHandlerFilter,
  EthereumDatasourceKind,
  EthereumRuntimeHandlerInputMap as EthereumRuntimeHandlerInputMap,
} from '@subql/types-ethereum';

export type IEthereumProjectManifest = IProjectManifest<SubqlDatasource>;

export interface EthereumProjectNetworkConfig extends ProjectNetworkConfig {
  genesisHash?: string;
  chainId?: string;
  subnet?: string;
}

export enum SubqlEthereumHandlerKind {
  FlareBlock = 'flare/BlockHandler',
  FlareCall = 'flare/TransactionHandler',
  FlareEvent = 'flare/LogHandler',
  EthBlock = 'ethereum/BlockHandler',
  EthCall = 'ethereum/TransactionHandler',
  EthEvent = 'ethereum/LogHandler',
}

export enum SubqlEthereumDatasourceKind {
  FlareRuntime = 'flare/Runtime',
  EthRuntime = 'ethereum/Runtime',
}
