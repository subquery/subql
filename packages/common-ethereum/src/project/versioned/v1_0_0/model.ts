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
import {SubqlCustomDatasource, SubqlMapping, SubqlRuntimeDatasource} from '@subql/types-ethereum';
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
import {CustomDataSourceBase, EthereumMapping, RuntimeDataSourceBase} from '../../models';
import {SubqlEthereumDataSource, SubqlRuntimeHandler} from '../../types';
import {CustomDatasourceTemplate, EthereumProjectManifestV1_0_0, RuntimeDatasourceTemplate} from './types';

const Ethereum_NODE_NAME = `@subql/node-ethereum`;
const Flare_NODE_NAME = `@subql/node-flare`;

export class EthereumProjectMapping extends EthereumMapping {
  @IsString()
  file: string;
}

export class EthereumRunnerNodeImpl extends RunnerNodeImpl {
  @IsIn([Ethereum_NODE_NAME, Flare_NODE_NAME], {
    message: `Runner Substrate node name incorrect, suppose be '${Ethereum_NODE_NAME}'`,
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

export class EthereumRuntimeDataSourceImpl
  extends RuntimeDataSourceBase<SubqlMapping<SubqlRuntimeHandler>>
  implements SubqlRuntimeDatasource
{
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class EthereumCustomDataSourceImpl<
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

export class RuntimeDatasourceTemplateImpl extends EthereumRuntimeDataSourceImpl implements RuntimeDatasourceTemplate {
  @IsString()
  name: string;
}

export class CustomDatasourceTemplateImpl extends EthereumCustomDataSourceImpl implements CustomDatasourceTemplate {
  @IsString()
  name: string;
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
  @Type(() => EthereumRunnerSpecsImpl)
  runner: RunnerSpecs;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => EthereumCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [
        {value: EthereumRuntimeDataSourceImpl, name: 'flare/Runtime'},
        {value: EthereumRuntimeDataSourceImpl, name: 'ethereum/Runtime'},
      ],
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
      subTypes: [
        {value: RuntimeDatasourceTemplateImpl, name: 'flare/Runtime'},
        {value: RuntimeDatasourceTemplateImpl, name: 'ethereum/Runtime'},
      ],
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
  @Type(() => EthereumCustomDataSourceImpl, {
    discriminator: {
      property: 'kind',
      subTypes: [
        {value: EthereumRuntimeDataSourceImpl, name: 'flare/Runtime'},
        {value: EthereumRuntimeDataSourceImpl, name: 'ethereum/Runtime'},
      ],
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
      subTypes: [
        {value: RuntimeDatasourceTemplateImpl, name: 'flare/Runtime'},
        {value: RuntimeDatasourceTemplateImpl, name: 'ethereum/Runtime'},
      ],
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
      //validateSync(this._deployment.)
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
