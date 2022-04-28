// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common-avalanche';
import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {CustomDataSourceBase, Mapping, RuntimeDataSourceBase} from '../../models';
import {CustomDatasourceV0_2_0, ProjectManifestV0_2_0, RuntimeDataSourceV0_2_0, SubqlMappingV0_2_0} from './types';

export class FileType {
  @IsString()
  file: string;
}

export class ProjectNetworkDeploymentV0_2_0 {
  @IsString()
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

export class ProjectMappingV0_2_0 extends Mapping {
  @IsString()
  file: string;
}

function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    // TODO: print error details
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}

export class RuntimeDataSourceV0_2_0Impl
  extends RuntimeDataSourceBase<SubqlMappingV0_2_0<SubqlRuntimeHandler>>
  implements RuntimeDataSourceV0_2_0
{
  @Type(() => ProjectMappingV0_2_0)
  @ValidateNested()
  mapping: SubqlMappingV0_2_0<SubqlRuntimeHandler>;

  validate(): void {
    return validateObject(this, 'failed to validate runtime datasource.');
  }
}

export class CustomDataSourceV0_2_0Impl<
    K extends string = string,
    T extends SubqlNetworkFilter = SubqlNetworkFilter,
    M extends SubqlMapping = SubqlMappingV0_2_0<SubqlCustomHandler>
  >
  extends CustomDataSourceBase<K, T, M>
  implements SubqlCustomDatasource<K, T, M>
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
  @Type(() => CustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDataSourceV0_2_0Impl, name: 'substrate/Runtime'}],
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
  implements ProjectManifestV0_2_0
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
  @Type(() => CustomDataSourceV0_2_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDataSourceV0_2_0Impl, name: 'substrate/Runtime'}],
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
