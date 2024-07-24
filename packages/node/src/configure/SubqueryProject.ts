// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { RegisteredTypes } from '@polkadot/types/types';
import {
  parseSubstrateProjectManifest,
  SubstrateBlockFilter,
  isRuntimeDs,
  SubstrateHandlerKind,
  isCustomDs,
} from '@subql/common-substrate';
import { CronFilter, BaseSubqueryProject } from '@subql/node-core';
import {
  SubstrateDatasource,
  RuntimeDatasourceTemplate,
  CustomDatasourceTemplate,
  SubstrateNetworkConfig,
} from '@subql/types';
import { Reader } from '@subql/types-core';
import { getChainTypes } from '../utils/project';

const { version: packageVersion } = require('../../package.json');

export type SubstrateProjectDs = SubstrateDatasource;
export type SubqlProjectDsTemplate =
  | RuntimeDatasourceTemplate
  | CustomDatasourceTemplate;

export type SubqlProjectBlockFilter = SubstrateBlockFilter & CronFilter;

export type SubqueryProject = BaseSubqueryProject<
  SubstrateProjectDs,
  SubqlProjectDsTemplate,
  SubstrateNetworkConfig
> & { chainTypes?: RegisteredTypes };

export async function createSubQueryProject(
  path: string,
  rawManifest: unknown,
  reader: Reader,
  root: string, // If project local then directory otherwise temp directory
  networkOverrides?: Partial<SubstrateNetworkConfig>,
): Promise<SubqueryProject> {
  const project = await BaseSubqueryProject.create<SubqueryProject>({
    parseManifest: (raw) => parseSubstrateProjectManifest(raw).asV1_0_0,
    path,
    rawManifest,
    reader,
    root,
    nodeSemver: packageVersion,
    blockHandlerKind: SubstrateHandlerKind.Block,
    networkOverrides,
    isRuntimeDs,
    isCustomDs,
  });

  project.chainTypes = project.network.chaintypes
    ? await getChainTypes(reader, root, project.network.chaintypes.file)
    : undefined;

  return project;
}
