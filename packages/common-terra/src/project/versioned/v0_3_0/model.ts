// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common';
import {
  SubqlTerraCustomDatasource,
  SubqlTerraCustomHandler,
  SubqlTerraMapping,
  SubqlTerraRuntimeHandler,
} from '@subql/types-terra';

import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {TerraCustomDataSourceBase, TerraRuntimeDataSourceBase, TerraMapping} from '../../models';
import {CustomDatasourceV0_3_0, TerraProjectManifestV0_3_0, RuntimeDataSourceV0_3_0, SubqlMappingV0_3_0} from './types';

export class FileTypeV0_3_0 {
  @IsString()
  file: string;
}

export class TerraProjectNetworkDeploymentV0_3_0 {
  @IsString()
  chainId: string;
}

export class TerraProjectNetworkV0_3_0 extends TerraProjectNetworkDeploymentV0_3_0 {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsString()
  @IsOptional()
  genesisHash?: string;
}

export class TerraProjectMappingV0_3_0 extends TerraMapping {
  @IsString()
  file: string;
}

export class TerraRuntimeDataSourceV0_3_0Impl
  extends TerraRuntimeDataSourceBase<SubqlMappingV0_3_0<SubqlTerraRuntimeHandler>>
  implements RuntimeDataSourceV0_3_0
{
  @Type(() => TerraProjectMappingV0_3_0)
  @ValidateNested()
  mapping: SubqlMappingV0_3_0<SubqlTerraRuntimeHandler>;
}

export class TerraCustomDataSourceV0_3_0Impl<
    K extends string = string,
    M extends SubqlTerraMapping = SubqlTerraMapping<SubqlTerraCustomHandler>
  >
  extends TerraCustomDataSourceBase<K, M>
  implements SubqlTerraCustomDatasource<K, M> {}

export class DeploymentV0_3_0 {
  @Equals('0.3.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => TerraCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: TerraRuntimeDataSourceV0_3_0Impl, name: 'terra/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  @ValidateNested()
  @Type(() => TerraProjectNetworkDeploymentV0_3_0)
  network: TerraProjectNetworkDeploymentV0_3_0;
}

export class ProjectManifestV0_3_0Impl extends ProjectManifestBaseImpl implements TerraProjectManifestV0_3_0 {
  @Equals('0.3.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => TerraProjectNetworkV0_3_0)
  network: TerraProjectNetworkV0_3_0;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => TerraCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: TerraRuntimeDataSourceV0_3_0Impl, name: 'terra/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  private _deployment: DeploymentV0_3_0;

  toDeployment(): string {
    return yaml.dump(this._deployment, {
      sortKeys: true,
      condenseFlow: true,
    });
  }

  get deployment(): DeploymentV0_3_0 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_3_0, this);
      validateSync(this._deployment, {whitelist: true});
    }
    return this._deployment;
  }

  validate(): void {
    const errors = validateSync(this.deployment, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
