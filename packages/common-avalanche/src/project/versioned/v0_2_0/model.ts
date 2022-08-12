// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BaseMapping, ProjectManifestBaseImpl} from '@subql/common';
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
import {SubstrateCustomDataSource, SubstrateNetworkFilter} from '../../types';
import {
  CustomDatasourceV0_2_0,
  SubstrateProjectManifestV0_2_0,
  RuntimeDataSourceV0_2_0,
  AvalancheDatasourceV0_2_0,
} from './types';

export class FileType {
  @IsString()
  file: string;
}

export class ProjectNetworkDeploymentV0_2_0 {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  genesisHash: string;
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileType;
}

export class ProjectNetworkV0_2_0 extends ProjectNetworkDeploymentV0_2_0 {
  @IsString()
  @IsOptional()
  endpoint?: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
}

function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    // TODO: print error details
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}

export class SubstrateRuntimeDataSourceV0_2_0Impl extends RuntimeDataSourceBase implements RuntimeDataSourceV0_2_0 {
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class AvalancheRuntimeDataSourceV0_2_0Impl extends RuntimeDataSourceBase implements AvalancheDatasourceV0_2_0 {
  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class SubstrateCustomDataSourceV0_2_0Impl<
    K extends string = string,
    T extends SubstrateNetworkFilter = SubstrateNetworkFilter,
    M extends BaseMapping<any, any> = BaseMapping<Record<string, unknown>, any>
  >
  extends CustomDataSourceBase<K, T, M>
  implements SubstrateCustomDataSource<K, T, M>
{
  validate(): void {
    return validateObject(this, 'failed to validate custom datasource.');
  }
}

export class DeploymentV0_2_0 {
  @Equals('0.2.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'avalanche/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV0_2_0)
  network: ProjectNetworkDeploymentV0_2_0;
}

export class ProjectManifestV0_2_0Impl<D extends object = DeploymentV0_2_0>
  extends ProjectManifestBaseImpl<D>
  implements SubstrateProjectManifestV0_2_0
{
  @Equals('0.2.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_2_0)
  network: ProjectNetworkV0_2_0;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => SubstrateCustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SubstrateRuntimeDataSourceV0_2_0Impl, name: 'avalanche/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  protected _deployment: D;

  get deployment(): D {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_2_0, this) as unknown as D;
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
