// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IsString} from 'class-validator';

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

export class FileType implements FileReference {
  @IsString()
  file: string;
}
