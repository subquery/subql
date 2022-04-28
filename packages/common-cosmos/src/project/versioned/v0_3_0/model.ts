// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common';
import {
  SubqlCosmosCustomDatasource,
  SubqlCosmosCustomHandler,
  SubqlCosmosMapping,
  SubqlCosmosRuntimeHandler,
} from '@subql/types-cosmos';

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
import {CosmosCustomDataSourceBase, CosmosRuntimeDataSourceBase, CosmosMapping} from '../../models';
import {
  CustomDatasourceV0_3_0,
  CosmosProjectManifestV0_3_0,
  RuntimeDataSourceV0_3_0,
  SubqlMappingV0_3_0,
} from './types';

export class FileTypeV0_3_0 {
  @IsString()
  file: string;
}

export class CosmosProjectNetworkDeploymentV0_3_0 {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  chainId: string;
}

export class CosmosProjectNetworkV0_3_0 extends CosmosProjectNetworkDeploymentV0_3_0 {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsString()
  @IsOptional()
  genesisHash?: string;
}

export class CosmosProjectMappingV0_3_0 extends CosmosMapping {
  @IsString()
  file: string;
}

export class CosmosRuntimeDataSourceV0_3_0Impl
  extends CosmosRuntimeDataSourceBase<SubqlMappingV0_3_0<SubqlCosmosRuntimeHandler>>
  implements RuntimeDataSourceV0_3_0
{
  @Type(() => CosmosProjectMappingV0_3_0)
  @ValidateNested()
  mapping: SubqlMappingV0_3_0<SubqlCosmosRuntimeHandler>;
}

export class CosmosCustomDataSourceV0_3_0Impl<
    K extends string = string,
    M extends SubqlCosmosMapping = SubqlCosmosMapping<SubqlCosmosCustomHandler>
  >
  extends CosmosCustomDataSourceBase<K, M>
  implements SubqlCosmosCustomDatasource<K, M> {}

export class DeploymentV0_3_0 {
  @Equals('0.3.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => CosmosCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: CosmosRuntimeDataSourceV0_3_0Impl, name: 'Cosmos/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  @ValidateNested()
  @Type(() => CosmosProjectNetworkDeploymentV0_3_0)
  network: CosmosProjectNetworkDeploymentV0_3_0;
}

export class ProjectManifestV0_3_0Impl
  extends ProjectManifestBaseImpl<DeploymentV0_3_0>
  implements CosmosProjectManifestV0_3_0
{
  @Equals('0.3.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => CosmosProjectNetworkV0_3_0)
  network: CosmosProjectNetworkV0_3_0;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => CosmosCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: CosmosRuntimeDataSourceV0_3_0Impl, name: 'Cosmos/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  protected _deployment: DeploymentV0_3_0;

  get deployment(): DeploymentV0_3_0 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_3_0, this);
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }
}
