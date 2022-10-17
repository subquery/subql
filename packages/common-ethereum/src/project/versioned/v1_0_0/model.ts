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
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {SubqlEthereumDataSource} from '../../types';
import {CustomDatasourceTemplate, RuntimeDatasourceTemplate} from '../v0_2_1';
import {
  FileType,
  EthereumCustomDataSourceV0_3_0Impl,
  EthereumRuntimeDataSourceV0_3_0Impl,
  RuntimeDataSourceV0_3_0,
  CustomDatasourceV0_3_0,
} from '../v0_3_0';
import {EthereumProjectManifestV1_0_0} from './types';

const Ethereum_NODE_NAME = `@subql/node-ethereum`;

export class RuntimeDatasourceTemplateImpl
  extends EthereumRuntimeDataSourceV0_3_0Impl
  implements RuntimeDatasourceTemplate
{
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl
  extends EthereumCustomDataSourceV0_3_0Impl
  implements CustomDatasourceTemplate
{
  @IsString()
  name: string;
}

export class EthereumRunnerNodeImpl implements NodeSpec {
  @Equals(Ethereum_NODE_NAME, {message: `Runner Substrate node name incorrect, suppose be '${Ethereum_NODE_NAME}'`})
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX,{message: 'runner version is not correct'})
  version: string;
}

export class EthereumRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => EthereumRunnerNodeImpl)
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
  @IsString()
  subnet: string;
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
  @Type(() => EthereumRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => EthereumCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: EthereumRuntimeDataSourceV0_3_0Impl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: EthereumRuntimeDataSourceV0_3_0Impl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl<D extends object = DeploymentV1_0_0>
  extends ProjectManifestBaseImpl<D>
  implements EthereumProjectManifestV1_0_0
{
  @Equals('1.0.0')
  specVersion: string;
  @Type(() => EthereumCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: EthereumRuntimeDataSourceV0_3_0Impl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: SubqlEthereumDataSource[];
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
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => EthereumRunnerSpecsImpl)
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
