// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestBaseImpl} from '@subql/common';
import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import {plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsString, ValidateNested, validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {CustomDataSourceBase, RuntimeDataSourceBase} from '../../models';
import {
  FileType,
  ProjectNetworkV0_2_0,
  ProjectNetworkDeploymentV0_2_0,
  ProjectMappingV0_2_0,
  CustomDatasourceV0_2_0,
  RuntimeDataSourceV0_2_0,
  SubqlMappingV0_2_0,
} from '../v0_2_0';
import {SubstrateProjectManifestV0_3_0} from './types';

export class RuntimeDataSourceV0_3_0Impl
  extends RuntimeDataSourceBase<SubqlMappingV0_2_0<SubqlRuntimeHandler>>
  implements RuntimeDataSourceV0_2_0
{
  @Type(() => ProjectMappingV0_2_0)
  @ValidateNested()
  mapping: SubqlMappingV0_2_0<SubqlRuntimeHandler>;
}

export class CustomDataSourceV0_3_0Impl<
    K extends string = string,
    T extends SubqlNetworkFilter = SubqlNetworkFilter,
    M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>
  >
  extends CustomDataSourceBase<K, T, M>
  implements SubqlCustomDatasource<K, T, M> {}

export class DeploymentV0_3_0 {
  @Equals('0.3.0')
  @IsString()
  specVersion: string;
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
  @IsArray()
  @ValidateNested()
  @Type(() => CustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDataSourceV0_3_0Impl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  @ValidateNested()
  @Type(() => ProjectNetworkDeploymentV0_2_0)
  network: ProjectNetworkDeploymentV0_2_0;
}

export class ProjectManifestV0_3_0Impl extends ProjectManifestBaseImpl implements SubstrateProjectManifestV0_3_0 {
  @Equals('0.3.0')
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
  @Type(() => CustomDataSourceV0_3_0Impl, {
    discriminator: {
      property: 'kind',
      subTypes: [{value: RuntimeDataSourceV0_3_0Impl, name: 'substrate/Runtime'}],
    },
    keepDiscriminatorProperty: true,
  })
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
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
