// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsString, ValidateNested, validateSync} from 'class-validator';
import {
  FileType,
  ProjectNetworkV0_2_0,
  ProjectNetworkDeploymentV0_2_0,
  CustomDatasourceV0_2_0,
  RuntimeDataSourceV0_2_0,
  ProjectManifestV0_2_0Impl,
  SubstrateCustomDataSourceV0_2_0Impl,
  SubstrateRuntimeDataSourceV0_2_0Impl,
} from '../v0_2_0';
import {SubstrateProjectManifestV0_3_0} from './types';

export class DeploymentV0_3_0 {
  @Equals('0.3.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'avalanche/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV0_2_0)
  network: ProjectNetworkDeploymentV0_2_0;
}

export class ProjectManifestV0_3_0Impl
  extends ProjectManifestV0_2_0Impl<DeploymentV0_3_0>
  implements SubstrateProjectManifestV0_3_0
{
  @Equals('0.3.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_2_0)
  network: ProjectNetworkV0_2_0;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'avalanche/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  protected _deployment: DeploymentV0_3_0;

  get deployment(): DeploymentV0_3_0 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_3_0, this);
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
