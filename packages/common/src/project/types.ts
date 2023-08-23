// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IsString, IsOptional, IsInt} from 'class-validator';

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

export interface BlockFilter {
  modulo?: number;
  timestamp?: string;
}

export class BlockFilterImpl implements BlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}
