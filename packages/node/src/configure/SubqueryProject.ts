// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { validateSemver } from '@subql/common';
import {
  StellarProjectNetworkConfig,
  parseStellarProjectManifest,
  isCustomDs,
  StellarHandlerKind,
  isRuntimeDs,
  SubqlStellarDataSource,
} from '@subql/common-stellar';
import { CronFilter, BaseSubqueryProject } from '@subql/node-core';
import { Reader } from '@subql/types-core';
import {
  SubqlDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
  StellarBlockFilter,
} from '@subql/types-stellar';

const { version: packageVersion } = require('../../package.json');

export type StellarProjectDs = SubqlStellarDataSource;

export type StellarProjectDsTemplate =
  | RuntimeDatasourceTemplate
  | CustomDatasourceTemplate;

export type SubqlProjectBlockFilter = StellarBlockFilter & CronFilter;

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = StellarProjectNetworkConfig & { chainId: string };

export type SubqueryProject = BaseSubqueryProject<
  StellarProjectDs,
  StellarProjectDsTemplate,
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
    parseManifest: (raw) => parseStellarProjectManifest(raw).asV1_0_0,
    path,
    rawManifest,
    reader,
    root,
    nodeSemver: packageVersion,
    blockHandlerKind: StellarHandlerKind.Block,
    networkOverrides,
    isRuntimeDs,
    isCustomDs,
  });

  return project;
}

export function dsHasSorobanEventHandler(
  dataSources: SubqlDatasource[],
): boolean {
  return (
    dataSources.findIndex(function (ds) {
      return (
        isRuntimeDs(ds) &&
        ds.mapping.handlers.findIndex(function (handler) {
          return handler.kind === StellarHandlerKind.Event;
        }) !== -1
      );
    }) !== -1
  );
}
