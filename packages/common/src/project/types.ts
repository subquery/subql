// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
  //genesisHash?: string;
}
