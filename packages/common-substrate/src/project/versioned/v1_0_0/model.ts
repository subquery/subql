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
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {SubstrateRuntimeDataSource} from '../../types';
import {
  CustomDatasourceV0_2_0,
  FileType,
  RuntimeDataSourceV0_2_0,
  SubstrateCustomDataSourceV0_2_0Impl,
  SubstrateRuntimeDataSourceV0_2_0Impl,
} from '../v0_2_0';
import {
  CustomDatasourceTemplate,
  CustomDatasourceTemplateImpl,
  RuntimeDatasourceTemplate,
  RuntimeDatasourceTemplateImpl,
} from '../v0_2_1';
import {SubstrateProjectManifestV1_0_0} from './types';

const SUBSTRATE_NODE_NAME = `@subql/node`;
const AVALANCHE_NODE_NAME = `@subql/node-avalanche`;

export class SubstrateRunnerNodeImpl implements NodeSpec {
  @IsIn([SUBSTRATE_NODE_NAME, AVALANCHE_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${SUBSTRATE_NODE_NAME}' or '${AVALANCHE_NODE_NAME}'`,
  })
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX,{message: 'runner version is not correct'})
  version: string;
}

export class SubstrateRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => SubstrateRunnerNodeImpl)
  node: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}

export class ProjectNetworkDeploymentV1_0_0 {
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId: string;
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
}

export class ProjectNetworkV1_0_0 extends ProjectNetworkDeploymentV1_0_0 {
  @IsString()
  @IsOptional()
  endpoint?: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class DeploymentV1_0_0 {
  @Transform((params) => {
    if (params.value.genesisHash && !params.value.chainId) {
      params.value.chainId = params.value.genesisHash;
    }
    return plainToClass(ProjectNetworkDeploymentV1_0_0, params.value);
  })
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV1_0_0)
  network: ProjectNetworkDeploymentV1_0_0;
  @Equals('1.0.0')
  @IsString()
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => SubstrateRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
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

export class ProjectManifestV1_0_0Impl<D extends object = DeploymentV1_0_0>
  extends ProjectManifestBaseImpl<D>
  implements SubstrateProjectManifestV1_0_0
{
  @Equals('1.0.0')
  specVersion: string;
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (SubstrateRuntimeDataSource | CustomDatasourceV0_2_0)[];
  @Type(() => ProjectNetworkV1_0_0)
  network: ProjectNetworkV1_0_0;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
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
  @IsObject()
  @ValidateNested()
  @Type(() => SubstrateRunnerSpecsImpl)
  runner: RunnerSpecs;
  protected _deployment: D;

  get deployment(): D {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV1_0_0, this) as unknown as D;
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
