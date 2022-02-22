// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common';
import {SubqlMapping, SubqlRuntimeHandler} from '@subql/types';
import {Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import {RuntimeDataSourceBase, ChainTypes} from '../../models';
import {SubstrateProjectNetworkConfig} from '../../types';
import {ProjectManifestV0_0_1, RuntimeDataSourceV0_0_1} from './types';

export class ProjectNetworkV0_0_1 extends ChainTypes implements SubstrateProjectNetworkConfig {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class RuntimeDataSourceV0_0_1Impl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements RuntimeDataSourceV0_0_1
{
  @IsString()
  name: string;
}

export class ProjectManifestV0_0_1Impl extends ProjectManifestBaseImpl<null> implements ProjectManifestV0_0_1 {
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
  dataSources: RuntimeDataSourceV0_0_1[];

  get deployment(): null {
    throw new Error('Manifest spec 0.0.1 is not support for deployment, please migrate to 0.2.0 or above');
  }

  validate(): void {
    const errors = validateSync(this, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
