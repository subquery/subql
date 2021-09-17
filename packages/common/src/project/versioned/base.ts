// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RuntimeDataSource} from '@subql/common/project/models';
import {Type} from 'class-transformer';
import {Allow, IsArray, IsString, ValidateNested} from 'class-validator';

export class ProjectManifestBaseImpl {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsString()
  specVersion: string;
  @IsArray()
  @ValidateNested()
  @Type(() => RuntimeDataSource)
  dataSources: RuntimeDataSource[];
}
