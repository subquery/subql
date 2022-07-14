// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {Equals, IsArray, IsOptional, IsString, ValidateNested} from 'class-validator';
import {GenericDataSourceV0_2_0Impl, GenericProjectManifestV0_2_0Impl} from '../v0_2_0';
import {GenericDatasourceTemplate} from './types';

export class GenericDatasourceTemplateImpl extends GenericDataSourceV0_2_0Impl implements GenericDatasourceTemplate {
  @IsString()
  name: string;
}

export class GenericProjectManifestV0_2_1Impl extends GenericProjectManifestV0_2_0Impl {
  @Equals('0.2.1')
  specVersion: string;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => GenericDatasourceTemplateImpl)
  templates?: GenericDatasourceTemplate[];
}
