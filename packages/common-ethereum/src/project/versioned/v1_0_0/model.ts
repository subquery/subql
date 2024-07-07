// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseDeploymentV1_0_0,
  FileType,
  ParentProjectModel,
  ProjectManifestBaseImpl,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
} from '@subql/common';
import {BaseMapping, NodeSpec, RunnerSpecs, QuerySpec, ParentProject} from '@subql/types-core';
import {
  CustomDatasourceTemplate,
  EthereumProjectManifestV1_0_0,
  RuntimeDatasourceTemplate,
  SubqlCustomDatasource,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import {plainToInstance, Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {CustomDataSourceBase, RuntimeDataSourceBase} from '../../models';
import {SubqlEthereumDataSource, SubqlRuntimeHandler} from '../../types';

const Ethereum_NODE_NAME = `@subql/node-ethereum`;

export class EthereumRunnerNodeImpl extends RunnerNodeImpl {
  @IsIn([Ethereum_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${Ethereum_NODE_NAME}'`,
  })
  name: string = Ethereum_NODE_NAME;
}

function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}

export class EthereumRuntimeDataSourceImpl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements SubqlRuntimeDatasource
{
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class EthereumCustomDataSourceImpl<K extends string = string, M extends BaseMapping<any> = BaseMapping<any>>
  extends CustomDataSourceBase<K, M>
  implements SubqlCustomDatasource<K, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends EthereumRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name!: string;
}

export class CustomDatasourceTemplateImpl extends EthereumCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name!: string;
}

export class EthereumRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => EthereumRunnerNodeImpl)
  node!: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query!: QuerySpec;
}

export class ProjectNetworkDeploymentV1_0_0 {
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId!: string;
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | `${number}-${number}`)[];
}

export class ProjectNetworkV1_0_0 extends ProjectNetworkDeploymentV1_0_0 {
  @IsString({each: true})
  endpoint!: string | string[];
  @IsString()
  @IsOptional()
  dictionary?: string;
}

export class DeploymentV1_0_0 extends BaseDeploymentV1_0_0 {
  @Transform((params) => {
    if (params.value.genesisHash && !params.value.chainId) {
      params.value.chainId = params.value.genesisHash;
    }
    return plainToInstance(ProjectNetworkDeploymentV1_0_0, params.value);
  })
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV1_0_0)
  network!: ProjectNetworkDeploymentV1_0_0;
  @IsObject()
  @ValidateNested()
  @Type(() => EthereumRunnerSpecsImpl)
  runner!: RunnerSpecs;
  @IsArray()
  @ValidateNested()
  @Type(() => EthereumCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: EthereumRuntimeDataSourceImpl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources!: (SubqlRuntimeDatasource | SubqlCustomDatasource)[];
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
}

export class ProjectManifestV1_0_0Impl
  extends ProjectManifestBaseImpl<DeploymentV1_0_0>
  implements EthereumProjectManifestV1_0_0
{
  constructor() {
    super(DeploymentV1_0_0);
  }

  @Equals('1.0.0')
  specVersion = '1.0.0';
  @Type(() => EthereumCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: EthereumRuntimeDataSourceImpl, name: 'ethereum/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources!: SubqlEthereumDataSource[];
  @Type(() => ProjectNetworkV1_0_0)
  network!: ProjectNetworkV1_0_0;
  @IsString()
  name!: string;
  @IsString()
  version!: string;
  @ValidateNested()
  @Type(() => FileType)
  schema!: FileType;
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
  runner!: RunnerSpecs;

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
}
