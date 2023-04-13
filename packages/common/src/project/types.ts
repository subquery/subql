// Copyright 2020-2022 OnFinality Limited authors & contributors
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
  endpoint: string | string[];
  dictionary?: string;
  bypassBlocks?: (number | string)[];
  //genesisHash?: string;
}

export interface FileReference {
  file: string;
}
