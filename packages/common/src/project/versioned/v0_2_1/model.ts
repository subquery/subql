// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import {
  CustomDataSourceV0_2_0Impl,
  DeploymentV0_2_0,
  ProjectManifestV0_2_0Impl,
  RuntimeDataSourceV0_2_0Impl,
} from '../v0_2_0';
import {CustomDatasourceTemplate, ProjectManifestV0_2_1, RuntimeDatasourceTemplate} from './types';

export class RuntimeDatasourceTemplateImpl extends RuntimeDataSourceV0_2_0Impl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends CustomDataSourceV0_2_0Impl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class DeploymentV0_2_1 extends DeploymentV0_2_0 {
  @Equals('0.2.1')
  @IsString()
  specVersion: string;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV0_2_1Impl
  extends ProjectManifestV0_2_0Impl<DeploymentV0_2_1>
  implements ProjectManifestV0_2_1
{
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  protected _deployment: DeploymentV0_2_1;

  get deployment(): DeploymentV0_2_1 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_2_1, this);
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
