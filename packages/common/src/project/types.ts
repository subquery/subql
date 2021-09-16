// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SubqlDataSource} from '@subql/types';

export interface IProjectManifest<M extends SubqlMapping = SubqlMapping> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: SubqlDataSource<M>[];
}

export interface ProjectNetworkConfig {
  endpoint: string;
  dictionary?: string;
  genesisHash?: string;
}
