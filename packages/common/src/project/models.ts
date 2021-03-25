// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes, RegisteredTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {SubqlKind} from './constants';
import {
  ProjectManifest,
  SubqlBlockFilter,
  SubqlCallFilter,
  SubqlEventFilter,
  SubqlNetworkFilter,
  SubqlHandler,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from './types';

export class ProjectNetwork implements RegisteredTypes {
  @IsString()
  endpoint: string;
  @IsObject()
  @IsOptional()
  types?: RegistryTypes;
  @IsObject()
  @IsOptional()
  typesAlias?: Record<string, OverrideModuleType>;
  @IsObject()
  @IsOptional()
  typesBundle?: OverrideBundleType;
  @IsObject()
  @IsOptional()
  typesChain?: Record<string, RegistryTypes>;
  @IsObject()
  @IsOptional()
  typesSpec?: Record<string, RegistryTypes>;
}

export class ProjectManifestImpl implements ProjectManifest {
  @Allow()
  definitions: object
  @IsString()
  description: string;
  @ValidateNested()
  @Type(() => ProjectNetwork)
  @IsObject()
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

export class BlockFilter implements SubqlBlockFilter {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  specVersion?: [number, number];
}

export class EventFilter extends BlockFilter implements SubqlEventFilter {
  @IsOptional()
  @IsString()
  module?: string;
  @IsOptional()
  @IsString()
  method?: string;
}

export class NetworkFilter implements SubqlNetworkFilter {
  @IsString()
  specName: string;
}


export class CallFilter extends EventFilter implements SubqlCallFilter {
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}

export class BlockHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockFilter)
  filter?: SubqlBlockFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.BlockHandler]})
  kind: SubqlKind.BlockHandler;
  @IsString()
  handler: string;
}

export class CallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: SubqlCallFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.CallHandler]})
  kind: SubqlKind.CallHandler;
  @IsString()
  handler: string;
}

export class EventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SubqlEventFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.EventHandler]})
  kind: SubqlKind.EventHandler;
  @IsString()
  handler: string;
}

export class Mapping implements SubqlMapping {
  @Transform((handlers: SubqlHandler[]) => {
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlKind.EventHandler:
          return plainToClass(EventHandler, handler);
        case SubqlKind.CallHandler:
          return plainToClass(CallHandler, handler);
        case SubqlKind.BlockHandler:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${handler.kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlHandler[];
}

export class RuntimeDataSource implements SubqlRuntimeDatasource {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: SubqlMapping;
  @IsString()
  name: string;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(()=> NetworkFilter)
  @IsOptional()
  filter?:SubqlNetworkFilter
}
