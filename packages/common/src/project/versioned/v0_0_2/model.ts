// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {Equals, IsObject, IsString, ValidateNested} from 'class-validator';
import {ProjectManifestBaseImpl} from '../base';
import {ProjectManifestV0_0_2} from './types';

export class FileType {
  @IsString()
  file: string;
}

export class ProjectNetworkV0_0_2 {
  @IsString()
  genesisHash: string;

  @IsObject()
  @ValidateNested()
  @Type(() => FileType)
  chaintypes: FileType;
}

export class ProjectManifestV0_0_2Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_0_2 {
  @Equals('0.2.0')
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_0_2)
  network: ProjectNetworkV0_0_2;
  // TODO: when really implement v0_0_2
  // @ValidateNested()
  // @Type(() => FileType)
  // schema: FileType;
  @IsString()
  schema: string;
}
