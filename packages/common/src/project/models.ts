// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IsArray, IsEnum, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {RegistryTypes} from '@polkadot/types/types';
import {ProjectManifest, SubqlCallFilter, SubqlEventFilter, SubqlMapping, SubqlRuntimeDatasource} from './types';
import {SubqlKind} from './constants';

export class ProjectNetwork {
  @IsString()
  endpoint: string;
  @IsObject()
  @IsOptional()
  customTypes?: RegistryTypes;
}

export class ProjectManifestImpl implements ProjectManifest {
  @IsString()
  description: string;
  @ValidateNested()
  @Type(() => ProjectNetwork)
  network: ProjectNetwork;
  @IsString()
  repository: string;
  @IsString()
  schema: string;
  @IsString()
  specVersion: string;
  @IsArray()
  @ValidateNested()
  @Type(() => RuntimeDataSource)
  dataSources: RuntimeDataSource[];
}

export class Filter implements SubqlCallFilter, SubqlEventFilter {
  @IsOptional()
  @IsString()
  module?: string;
  @IsOptional()
  @IsString()
  method?: string;
}

export class Handler {
  @IsOptional()
  @ValidateNested()
  @Type(() => Filter)
  filter?: SubqlCallFilter | SubqlEventFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.BlockHandler, SubqlKind.CallHandler, SubqlKind.EventHandler]})
  kind: SubqlKind.CallHandler | SubqlKind.BlockHandler | SubqlKind.EventHandler;
  @IsString()
  handler: string;
}

export class Mapping implements SubqlMapping {
  @Type(() => Handler)
  @IsArray()
  @ValidateNested()
  handlers: Handler[];
}

export class RuntimeDataSource implements SubqlRuntimeDatasource {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: SubqlMapping;
  name: string;
  startBlock: number;
}
