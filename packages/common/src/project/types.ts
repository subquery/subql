// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
