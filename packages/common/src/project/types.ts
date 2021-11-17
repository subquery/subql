// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';

export interface IProjectManifest {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlDatasource[];
  toDeployment(): string | undefined;
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
}
