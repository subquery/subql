// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common';
import {
  SubqlSolanaCustomDatasource,
  SubqlSolanaCustomHandler,
  SubqlSolanaMapping,
  SubqlSolanaRuntimeHandler,
} from '@subql/types-solana';

import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {SolanaCustomDataSourceBase, SolanaRuntimeDataSourceBase, SolanaMapping} from '../../models';
import {CustomDatasourceV0_3_0, SolanaProjectManifestV0_3_0, RuntimeDataSourceV0_3_0, SubqlMappingV0_3_0} from './types';

export class FileTypeV0_3_0 {
  @IsString()
  file: string;
}

export class SolanaProjectNetworkDeploymentV0_3_0 {
  @IsString()
  chainId: string;
}

export class SolanaProjectNetworkV0_3_0 extends SolanaProjectNetworkDeploymentV0_3_0 {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsString()
  @IsOptional()
  genesisHash?: string;
}

export class SolanaProjectMappingV0_3_0 extends SolanaMapping {
  @IsString()
  file: string;
}

export class SolanaRuntimeDataSourceV0_3_0Impl
  extends SolanaRuntimeDataSourceBase<SubqlMappingV0_3_0<SubqlSolanaRuntimeHandler>>
  implements RuntimeDataSourceV0_3_0
{
  @Type(() => SolanaProjectMappingV0_3_0)
  @ValidateNested()
  mapping: SubqlMappingV0_3_0<SubqlSolanaRuntimeHandler>;
}

export class SolanaCustomDataSourceV0_3_0Impl<
    K extends string = string,
    M extends SubqlSolanaMapping = SubqlSolanaMapping<SubqlSolanaCustomHandler>
  >
  extends SolanaCustomDataSourceBase<K, M>
  implements SubqlSolanaCustomDatasource<K, M> {}

export class DeploymentV0_3_0 {
  @Equals('0.3.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => SolanaCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SolanaRuntimeDataSourceV0_3_0Impl, name: 'Solana/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0)[];
  @ValidateNested()
  @Type(() => SolanaProjectNetworkDeploymentV0_3_0)
  network: SolanaProjectNetworkDeploymentV0_3_0;
}

export class ProjectManifestV0_3_0Impl extends ProjectManifestBaseImpl implements SolanaProjectManifestV0_3_0 {
  @Equals('0.3.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => SolanaProjectNetworkV0_3_0)
  network: SolanaProjectNetworkV0_3_0;
  @ValidateNested()
  @Type(() => FileTypeV0_3_0)
  schema: FileTypeV0_3_0;
  @IsArray()
  @ValidateNested()
  @Type(() => SolanaCustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SolanaRuntimeDataSourceV0_3_0Impl, name: 'Solana/Runtime'}],
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
