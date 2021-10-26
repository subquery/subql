// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeHandler,
} from '@subql/types';
import {Type} from 'class-transformer';
import {Equals, IsArray, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {CustomDataSourceBase, Mapping, RuntimeDataSourceBase} from '../../models';
import {ProjectManifestBaseImpl} from '../base';
import {ProjectManifestV0_2_0, RuntimeDataSourceV0_2_0, SubqlMappingV0_2_0} from './types';

export class FileType {
  @IsString()
  file: string;
}

export class ProjectNetworkV0_2_0 {
  @IsString()
  genesisHash: string;
  @IsString()
  @IsOptional()
  endpoint: string;
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
  dataSources: (RuntimeDataSourceV0_2_0 | SubqlCustomDatasource)[];
}
