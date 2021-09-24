// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import { RuntimeDataSourceBase, ChainTypes } from '../../models';
import {ProjectNetworkConfig, SubqlMapping, SubqlNetworkFilter} from '../../types';
import {ProjectManifestBaseImpl} from '../base';
import {ProjectManifestV0_0_1, RuntimeDataSrouceV0_0_1} from './types';

export class ProjectNetworkV0_0_1 extends ChainTypes implements ProjectNetworkConfig {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class NetworkFilter implements SubqlNetworkFilter {
  @IsString()
  specName: string;
}

export class RuntimeDataSourceV0_0_1Impl extends RuntimeDataSourceBase<SubqlMapping> implements RuntimeDataSrouceV0_0_1 {
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkFilter)
  filter?: SubqlNetworkFilter;
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
  @IsArray()
  @ValidateNested()
  @Type(() => RuntimeDataSourceV0_0_1Impl)
  dataSources: RuntimeDataSrouceV0_0_1[];
}
