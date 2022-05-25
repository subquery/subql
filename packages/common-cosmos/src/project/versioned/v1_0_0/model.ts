// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  NodeSpec,
  ProjectManifestBaseImpl,
  QuerySpec,
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
import {RuntimeDatasourceTemplate, CustomDatasourceTemplate} from '../v0_2_1';
import {
  DeploymentV0_3_0,
  ProjectManifestV0_3_0Impl,
  CosmosCustomDataSourceV0_3_0Impl,
  CosmosRuntimeDataSourceV0_3_0Impl,
} from '../v0_3_0';
import {CosmosProjectManifestV1_0_0} from '../v1_0_0';

const COSMOS_NODE_NAME = `@subql/node-cosmos`;

export class RuntimeDatasourceTemplateImpl
  extends CosmosRuntimeDataSourceV0_3_0Impl
  implements RuntimeDatasourceTemplate
{
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends CosmosCustomDataSourceV0_3_0Impl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class CosmosRunnerNodeImpl implements NodeSpec {
  @Equals(COSMOS_NODE_NAME, {message: `Runner Cosmos node name incorrect, suppose be '${COSMOS_NODE_NAME}'`})
  name: string;
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version: string;
}

export class CosmosRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => CosmosRunnerNodeImpl)
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
  @Type(() => CosmosRunnerSpecsImpl)
  runner: RunnerSpecs;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'cosmos/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl extends ProjectManifestV0_3_0Impl implements CosmosProjectManifestV1_0_0 {
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'cosmos/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => CosmosRunnerSpecsImpl)
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
