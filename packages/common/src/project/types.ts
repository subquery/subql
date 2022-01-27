// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';

export interface IProjectManifest {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlDatasource[];
  toDeployment(): string;
  validate(): void;
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
}
