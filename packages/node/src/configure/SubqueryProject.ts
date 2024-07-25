// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  parseEthereumProjectManifest,
  SubqlEthereumDataSource,
  isRuntimeDs,
  EthereumHandlerKind,
  isCustomDs,
} from '@subql/common-ethereum';
import { BaseSubqueryProject, CronFilter } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import {
  EthereumNetworkConfig,
  RuntimeDatasourceTemplate,
  CustomDatasourceTemplate,
  EthereumBlockFilter,
} from '@subql/types-ethereum';

const { version: packageVersion } = require('../../package.json');

export type EthereumProjectDs = SubqlEthereumDataSource;

export type EthereumProjectDsTemplate =
  | RuntimeDatasourceTemplate
  | CustomDatasourceTemplate;

export type SubqlProjectBlockFilter = EthereumBlockFilter & CronFilter;

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = EthereumNetworkConfig & { chainId: string };

export type SubqueryProject = BaseSubqueryProject<
  EthereumProjectDs,
  EthereumProjectDsTemplate,
  NetworkConfig
>;

export async function createSubQueryProject(
  path: string,
  rawManifest: unknown,
  reader: Reader,
  root: string, // If project local then directory otherwise temp directory
  networkOverrides?: Partial<NetworkConfig>,
): Promise<SubqueryProject> {
  const project = await BaseSubqueryProject.create<SubqueryProject>({
    parseManifest: (raw) => parseEthereumProjectManifest(raw).asV1_0_0,
    path,
    rawManifest,
    reader,
    root,
    nodeSemver: packageVersion,
    blockHandlerKind: EthereumHandlerKind.Block,
    networkOverrides,
    isRuntimeDs,
    isCustomDs,
  });

  return project;
}
