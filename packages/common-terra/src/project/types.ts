// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlTerraDatasource} from '@subql/types-terra';

export interface IProjectManifest {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlTerraDatasource[];
  toDeployment(): string;
  validate(): void;
}

export interface TerraProjectNetworkConfig {
  endpoint: string;
  chainId: string;
  dictionary?: string;
}
