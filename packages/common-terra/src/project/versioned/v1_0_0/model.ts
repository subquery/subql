// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  NodeSpec,
  QuerySpec,
  RUNNER_REGEX,
  RunnerQueryBaseModel,
  RunnerSpecs,
  SemverVersionValidator,
} from '@subql/common';
import {plainToClass, Type} from 'class-transformer';
import {
  Equals,
  IsObject,
  IsString,
  Matches,
  Validate,
  ValidateNested,
  validateSync,
  IsOptional,
  IsArray,
} from 'class-validator';
import {
  DeploymentV0_3_0,
  ProjectManifestV0_3_0Impl,
  TerraCustomDataSourceV0_3_0Impl,
  TerraRuntimeDataSourceV0_3_0Impl,
} from '../v0_3_0';
import {TerraProjectManifestV1_0_0} from '../v1_0_0';
import {RuntimeDatasourceTemplate, CustomDatasourceTemplate} from './types';

const TERRA_NODE_NAME = `@subql/node-terra`;

export class RuntimeDatasourceTemplateImpl
  extends TerraRuntimeDataSourceV0_3_0Impl
  implements RuntimeDatasourceTemplate
{
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends TerraCustomDataSourceV0_3_0Impl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class TerraRunnerNodeImpl implements NodeSpec {
  @Equals(TERRA_NODE_NAME, {message: `Runner Terra node name incorrect, suppose be '${TERRA_NODE_NAME}'`})
  name: string;
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version: string;
}

export class TerraRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => TerraRunnerNodeImpl)
  node: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}

export class DeploymentV1_0_0 extends DeploymentV0_3_0 {
  @Equals('1.0.0')
  @IsString()
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => TerraRunnerSpecsImpl)
  runner: RunnerSpecs;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'terra/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl extends ProjectManifestV0_3_0Impl implements TerraProjectManifestV1_0_0 {
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'terra/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => TerraRunnerSpecsImpl)
  runner: RunnerSpecs;
  protected _deployment: DeploymentV1_0_0;

  get deployment(): DeploymentV1_0_0 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV1_0_0, this);
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
