// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';
import {SubqlTerraDatasource} from '@subql/types-terra';

export interface IProjectManifest {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlDatasource[] | SubqlTerraDatasource[];
  toDeployment(): string;
  validate(): void;
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
}

export interface TerraProjectNetworkConfig {
  endpoint: string;
  chainId: string;
  dictionary?: string;
}
