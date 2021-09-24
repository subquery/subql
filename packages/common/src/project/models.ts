// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import {SubqlKind} from './constants';
import {
  SubqlBlockFilter,
  SubqlCallFilter,
  SubqlEventFilter,
  SubqlHandler,
  SubqlMapping,
  SubqlRuntimeDatasource,
} from './types';

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

export class ChainTypes implements RegisteredTypes {
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

export class RuntimeDataSourceBase<M extends SubqlMapping> implements SubqlRuntimeDatasource<M> {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: M;
  @IsString()
  name: string;
  @IsOptional()
  @IsInt()
  startBlock?: number;
}
