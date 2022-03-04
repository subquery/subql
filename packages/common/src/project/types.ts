// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDatasource} from '@subql/types';

export interface IProjectManifest<D> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: D[];
  toDeployment(): string;
  validate(): void;
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
  chainId?: string;
}

//Support until version 0.2.1
export type ISubstrateProjectManifest = IProjectManifest<SubqlDatasource>;
