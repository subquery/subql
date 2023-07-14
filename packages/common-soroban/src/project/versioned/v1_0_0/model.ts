// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  BaseMapping,
  FileType,
  NodeSpec,
  ProjectManifestBaseImpl,
  QuerySpec,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
  RunnerSpecs,
} from '@subql/common';
import {SubqlCustomDatasource, SubqlMapping, SubqlRuntimeDatasource} from '@subql/types-soroban';
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {CustomDataSourceBase, SorobanMapping, RuntimeDataSourceBase} from '../../models';
import {SubqlSorobanDataSource, SubqlRuntimeHandler} from '../../types';
import {CustomDatasourceTemplate, SorobanProjectManifestV1_0_0, RuntimeDatasourceTemplate} from './types';

const Soroban_NODE_NAME = `@subql/node-soroban`;

export class SorobanProjectMapping extends SorobanMapping {
  @IsString()
  file: string;
}

export class SorobanRunnerNodeImpl extends RunnerNodeImpl {
  @IsIn([Soroban_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${Soroban_NODE_NAME}'`,
  })
  name: string;
}

function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}

export class SorobanRuntimeDataSourceImpl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements SubqlRuntimeDatasource
{
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class SorobanCustomDataSourceImpl<
    K extends string = string,
    M extends BaseMapping<any, any> = BaseMapping<Record<string, unknown>, any>
  >
  extends CustomDataSourceBase<K, M>
  implements SubqlCustomDatasource<K, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class RuntimeDatasourceTemplateImpl extends SorobanRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends SorobanCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
}

export class SorobanRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => SorobanRunnerNodeImpl)
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
  @Type(() => SorobanRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SorobanCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SorobanRuntimeDataSourceImpl, name: 'soroban/Runtime'}],
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
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'soroban/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}

export class ProjectManifestV1_0_0Impl<D extends object = DeploymentV1_0_0>
  extends ProjectManifestBaseImpl<D>
  implements SorobanProjectManifestV1_0_0
{
  @Equals('1.0.0')
  specVersion: string;
  @Type(() => SorobanCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SorobanRuntimeDataSourceImpl, name: 'soroban/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: SubqlSorobanDataSource[];
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
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'soroban/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => SorobanRunnerSpecsImpl)
  runner: RunnerSpecs;
  protected _deployment: D;

  get deployment(): D {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV1_0_0, this) as unknown as D;
      //validateSync(this._deployment.)
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
