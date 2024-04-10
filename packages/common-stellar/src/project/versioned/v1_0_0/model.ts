// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  FileType,
  ProjectManifestBaseImpl,
  ParentProjectModel,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
  validateObject,
  CommonProjectNetworkV1_0_0,
  BaseDeploymentV1_0_0,
} from '@subql/common';
import {BaseMapping, NodeSpec, ParentProject, QuerySpec, RunnerSpecs} from '@subql/types-core';
import {
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
  StellarProjectManifestV1_0_0,
  SubqlCustomDatasource,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from '@subql/types-stellar';
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
import {CustomDataSourceBase, StellarMapping, RuntimeDataSourceBase} from '../../models';
import {SubqlStellarDataSource, SubqlRuntimeHandler} from '../../types';

const Stellar_NODE_NAME = `@subql/node-stellar`;

export class StellarProjectMapping extends StellarMapping {
  @IsString()
  file: string;
}

export class StellarRunnerNodeImpl extends RunnerNodeImpl {
  @IsIn([Stellar_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${Stellar_NODE_NAME}'`,
  })
  name: string;
}

export class StellarRuntimeDataSourceImpl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements SubqlRuntimeDatasource
{
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class StellarCustomDataSourceImpl<K extends string = string, M extends BaseMapping<any> = BaseMapping<any>>
  extends CustomDataSourceBase<K, M>
  implements SubqlCustomDatasource<K, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends StellarRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends StellarCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class StellarRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => StellarRunnerNodeImpl)
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

  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | string)[];
}

export class StellarProjectNetwork extends CommonProjectNetworkV1_0_0<FileType> {
  @IsString()
  @IsOptional()
  soroban?: string;
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
  network: ProjectNetworkDeploymentV1_0_0;
  @IsObject()
  @ValidateNested()
  @Type(() => StellarRunnerSpecsImpl)
  runner: RunnerSpecs;
  @IsArray()
  @ValidateNested()
  @Type(() => StellarCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: StellarRuntimeDataSourceImpl, name: 'stellar/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (SubqlRuntimeDatasource | SubqlCustomDatasource)[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDatasourceTemplateImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'stellar/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl<D extends object = DeploymentV1_0_0>
  extends ProjectManifestBaseImpl<DeploymentV1_0_0>
  implements StellarProjectManifestV1_0_0
{
  constructor() {
    super(DeploymentV1_0_0);
  }

  @Equals('1.0.0')
  specVersion: string;
  @Type(() => StellarCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: StellarRuntimeDataSourceImpl, name: 'stellar/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: SubqlStellarDataSource[];
  @Type(() => StellarProjectNetwork)
  network: StellarProjectNetwork;
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
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'stellar/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => StellarRunnerSpecsImpl)
  runner: RunnerSpecs;

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
}
