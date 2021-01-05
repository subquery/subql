// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IsArray, IsEnum, IsOptional, IsString} from 'class-validator';
import {Type} from 'class-transformer';
import {
  ProjectManifest,
  SubqlCallFilter,
  SubqlDataSource,
  SubqlEventFilter,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from './types';
import {SubqlKind} from './constants';

export class ProjectManifestImpl implements ProjectManifest {
  @IsString()
  description: string;
  @IsString()
  endpoint: string;
  @IsString()
  repository: string;
  @IsString()
  schema: string;
  @IsString()
  specVersion: string;
  @IsArray()
  dataSources: SubqlDataSource[];
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
  handlers: Handler[];
}

export class RuntimeDataSource implements SubqlRuntimeDatasource {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  mapping: SubqlMapping;
  name: string;
  startBlock: number;
}
