// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes, RegisteredTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {Type} from 'class-transformer';
import {Equals, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {ProjectNetworkConfig} from '../../types';
import {ProjectManifestBaseImpl} from '../base';
import {ProjectManifestV0_0_1} from './types';

export class ProjectNetworkV0_0_1 implements RegisteredTypes, ProjectNetworkConfig {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsObject()
  @IsOptional()
  types?: RegistryTypes;
  @IsObject()
  @IsOptional()
  typesAlias?: Record<string, OverrideModuleType>;
  @IsObject()
  @IsOptional()
  typesBundle?: OverrideBundleType;
  @IsObject()
  @IsOptional()
  typesChain?: Record<string, RegistryTypes>;
  @IsObject()
  @IsOptional()
  typesSpec?: Record<string, RegistryTypes>;
}

export class ProjectManifestV0_0_1Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_0_1 {
  @Equals('0.0.1')
  specVersion: string;
  @ValidateNested()
  @Type(() => ProjectNetworkV0_0_1)
  @IsObject()
  network: ProjectNetworkV0_0_1;
  @IsString()
  schema: string;
}
