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
import {
  CustomDatasourceV0_0_1,
  SolanaProjectManifestV0_0_1,
  RuntimeDataSourceV0_0_1,
  SubqlMappingV0_0_1,
} from './types';

export class FileTypeV0_0_1 {
  @IsString()
  file: string;
}

export class SolanaProjectNetworkDeploymentV0_0_1 {
  @IsString()
  chainId: string;
}

export class SolanaProjectNetworkV0_0_1 extends SolanaProjectNetworkDeploymentV0_0_1 {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsString()
  @IsOptional()
  genesisHash?: string;
}

export class SolanaProjectMappingV0_0_1 extends SolanaMapping {
  @IsString()
  file: string;
}

export class SolanaRuntimeDataSourceV0_0_1Impl
  extends SolanaRuntimeDataSourceBase<SubqlMappingV0_0_1<SubqlSolanaRuntimeHandler>>
  implements RuntimeDataSourceV0_0_1
{
  @Type(() => SolanaProjectMappingV0_0_1)
  @ValidateNested()
  mapping: SubqlMappingV0_0_1<SubqlSolanaRuntimeHandler>;
}

export class SolanaCustomDataSourceV0_0_1Impl<
    K extends string = string,
    M extends SubqlSolanaMapping = SubqlSolanaMapping<SubqlSolanaCustomHandler>
  >
  extends SolanaCustomDataSourceBase<K, M>
  implements SubqlSolanaCustomDatasource<K, M> {}

export class DeploymentV0_0_1 {
  @Equals('0.0.1')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileTypeV0_0_1)
  schema: FileTypeV0_0_1;
  @IsArray()
  @ValidateNested()
  @Type(() => SolanaCustomDataSourceV0_0_1Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SolanaRuntimeDataSourceV0_0_1Impl, name: 'Solana/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_0_1 | CustomDatasourceV0_0_1)[];
  @ValidateNested()
  @Type(() => SolanaProjectNetworkDeploymentV0_0_1)
  network: SolanaProjectNetworkDeploymentV0_0_1;
}

export class ProjectManifestV0_0_1Impl
  extends ProjectManifestBaseImpl<DeploymentV0_0_1>
  implements SolanaProjectManifestV0_0_1
{
  @Equals('0.0.1')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => SolanaProjectNetworkV0_0_1)
  network: SolanaProjectNetworkV0_0_1;
  @ValidateNested()
  @Type(() => FileTypeV0_0_1)
  schema: FileTypeV0_0_1;
  @IsArray()
  @ValidateNested()
  @Type(() => SolanaCustomDataSourceV0_0_1Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: SolanaRuntimeDataSourceV0_0_1Impl, name: 'Solana/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_0_1 | CustomDatasourceV0_0_1)[];
  private _deployment: DeploymentV0_0_1;

  toDeployment(): string {
    return yaml.dump(this._deployment, {
      sortKeys: true,
      condenseFlow: true,
    });
  }

  get deployment(): DeploymentV0_0_1 {
    if (!this._deployment) {
      this._deployment = plainToClass(DeploymentV0_0_1, this);
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
