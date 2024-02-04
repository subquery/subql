// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IProjectManifest} from '@subql/types-core';
import {SubqlDatasource} from '@subql/types-ethereum';

// All of these used to be redefined in this file, re-exporting for simplicity
export {
  SubqlEthereumProcessorOptions,
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
