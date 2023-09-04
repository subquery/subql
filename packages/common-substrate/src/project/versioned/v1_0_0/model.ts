// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  FileType,
  ParentProjectModel,
  ProjectManifestBaseImpl,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
  validateObject,
} from '@subql/common';
import {
  SubstrateCustomDatasource,
  SubstrateNetworkFilter,
  SubstrateRuntimeDatasource,
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
  SubstrateProjectManifestV1_0_0,
} from '@subql/types';
import {BaseMapping, NodeSpec, ParentProject, QuerySpec, RunnerSpecs} from '@subql/types-core';
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {CustomDataSourceBase, RuntimeDataSourceBase} from '../../models';

const SUBSTRATE_NODE_NAME = `@subql/node`;

export class SubstrateRunnerNodeImpl extends RunnerNodeImpl {
  @Equals(SUBSTRATE_NODE_NAME, {message: `Runner Substrate node name incorrect, suppose be '${SUBSTRATE_NODE_NAME}'`})
  name: string;
}

export class SubstrateRuntimeDataSourceImpl extends RuntimeDataSourceBase implements SubstrateRuntimeDatasource {
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class SubstrateCustomDataSourceImpl<
    K extends string = string,
    T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
    M extends BaseMapping<any, any> = BaseMapping<Record<string, unknown>, any>
  >
  extends CustomDataSourceBase<K, T, M>
  implements SubstrateCustomDatasource<K, T, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends SubstrateRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends SubstrateCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
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
  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | string)[];
}

export class ProjectNetworkV1_0_0 extends ProjectNetworkDeploymentV1_0_0 {
  @IsString({each: true})
  @IsOptional()
  endpoint?: string | string[];
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
  @Type(() => SubstrateCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceImpl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (SubstrateRuntimeDatasource | SubstrateCustomDatasource)[];
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

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
}

export class ProjectManifestV1_0_0Impl<D extends object = DeploymentV1_0_0>
  extends ProjectManifestBaseImpl<D>
  implements SubstrateProjectManifestV1_0_0
{
  @Equals('1.0.0')
  specVersion: string;
  @Type(() => SubstrateCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceImpl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (SubstrateRuntimeDatasource | SubstrateCustomDatasource)[];
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

  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;

  get deployment(): D {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV1_0_0, this) as unknown as D;
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
