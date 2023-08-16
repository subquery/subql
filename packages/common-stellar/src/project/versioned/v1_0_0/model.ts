// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseMapping,
  FileType,
  NodeSpec,
  ProjectManifestBaseImpl,
  QuerySpec,
  RunnerNodeImpl,
  RunnerQueryBaseModel,
  RunnerSpecs,
  validateObject,
} from '@subql/common';
import {SubqlCustomDatasource, SubqlMapping, SubqlRuntimeDatasource} from '@subql/types-stellar';
import {plainToClass, Transform, TransformFnParams, Type} from 'class-transformer';
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
import {CustomDatasourceTemplate, StellarProjectManifestV1_0_0, RuntimeDatasourceTemplate} from './types';

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

export class StellarCustomDataSourceImpl<
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
  soroban?: string;
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
  @Type(() => StellarRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
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
  extends ProjectManifestBaseImpl<D>
  implements StellarProjectManifestV1_0_0
{
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
      subTypes: [{value: RuntimeDatasourceTemplateImpl, name: 'stellar/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
  @IsObject()
  @ValidateNested()
  @Type(() => StellarRunnerSpecsImpl)
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
