// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { Mapping, RuntimeDataSourceBase } from '../../models';
import {ProjectManifestBaseImpl} from '../base';
import {ProjectManifestV0_0_2, RuntimeDataSourceV0_0_2, SubqlMappingV0_0_2} from './types';

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
  @IsOptional()
  chaintypes: FileType;
}

export class ProjectMappingV0_0_2 extends Mapping {
  @IsString()
  file: string;
}

export class RuntimeDataSourceV0_0_2Impl extends RuntimeDataSourceBase<SubqlMappingV0_0_2> implements RuntimeDataSourceV0_0_2 {
  @Type(() => ProjectMappingV0_0_2)
  @ValidateNested()
  mapping: SubqlMappingV0_0_2;
}

export class ProjectManifestV0_0_2Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_0_2 {
  @Equals('0.0.2')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_0_2)
  network: ProjectNetworkV0_0_2;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => RuntimeDataSourceV0_0_2Impl)
  dataSources: RuntimeDataSourceV0_0_2[];
}
