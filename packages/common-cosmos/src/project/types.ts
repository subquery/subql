// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IProjectManifest, ProjectNetworkConfig} from '@subql/common';
import {SubqlCosmosDatasource} from '@subql/types-cosmos';

export type ICosmosProjectManifest = IProjectManifest<SubqlCosmosDatasource>;

export interface CosmosProjectNetworkConfig extends ProjectNetworkConfig {
  chainId?: string;
}
