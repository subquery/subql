// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import {Expose, plainToClass, Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import yaml from 'js-yaml';
import {CustomDataSourceBase, Mapping, RuntimeDataSourceBase} from '../../models';
import {ProjectManifestBaseImpl} from '../base';
import {CustomDatasourceV0_2_0, ProjectManifestV0_2_0, RuntimeDataSourceV0_2_0, SubqlMappingV0_2_0} from './types';

export class FileType {
  @Expose()
  @IsString()
  file: string;
}

export class ProjectNetworkV0_2_0 {
  @Expose()
  @IsString()
  genesisHash: string;
  @IsString()
  @IsOptional()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary: string;
  @Expose()
  @IsObject()
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes: FileType;
}

export class ProjectMappingV0_2_0 extends Mapping {
  @IsString()
  file: string;
}

export class RuntimeDataSourceV0_2_0Impl
  extends RuntimeDataSourceBase<SubqlMappingV0_2_0<SubqlRuntimeHandler>>
  implements RuntimeDataSourceV0_2_0
{
  @Type(() => ProjectMappingV0_2_0)
  @ValidateNested()
  mapping: SubqlMappingV0_2_0<SubqlRuntimeHandler>;
}

export class CustomDataSourceV0_2_0Impl<
    K extends string = string,
    T extends SubqlNetworkFilter = SubqlNetworkFilter,
    M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>
  >
  extends CustomDataSourceBase<K, T, M>
  implements SubqlCustomDatasource<K, T, M> {}

export class DeploymentV0_2_0 {
  @Expose()
  specVersion: string;
  @Expose()
  schema: FileType;
  @Expose()
  dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[];
  @Expose()
  network: ProjectNetworkV0_2_0;
}

export class ProjectManifestV0_2_0Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_2_0 {
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
  toDeployment(): string {
    const deployment = plainToClass(DeploymentV0_2_0, this, {excludeExtraneousValues: true});
    //manually assign the datasource
    deployment.dataSources = this.dataSources;
    return yaml.dump(deployment, {
      sortKeys: true,
      condenseFlow: true,
    });
  }
}
