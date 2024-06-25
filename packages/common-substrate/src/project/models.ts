// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {BaseDataSource, BlockFilterImpl, ProcessorImpl} from '@subql/common';
import {
  SubstrateBlockFilter,
  SubstrateBlockHandler,
  SubstrateCallFilter,
  SubstrateCallHandler,
  SubstrateCustomHandler,
  SubstrateDatasourceKind,
  SubstrateEventFilter,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeDatasource,
  SubstrateRuntimeHandler,
  SubstrateCustomDatasource,
} from '@subql/types';
import {BaseMapping, FileReference, Processor} from '@subql/types-core';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class BlockFilter extends BlockFilterImpl implements SubstrateBlockFilter {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  specVersion?: [number, number];
}

export class EventFilter implements SubstrateEventFilter {
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

export class CallFilter extends EventFilter implements SubstrateCallFilter {
  @IsOptional()
  @IsBoolean()
  success?: boolean;
  @IsOptional()
  @IsBoolean()
  isSigned?: boolean;
}

export class BlockHandler implements SubstrateBlockHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockFilter)
  filter?: SubstrateBlockFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Block]})
  kind!: SubstrateHandlerKind.Block;
  @IsString()
  handler!: string;
}

export class CallHandler implements SubstrateCallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: SubstrateCallFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Call]})
  kind!: SubstrateHandlerKind.Call;
  @IsString()
  handler!: string;
}

export class EventHandler implements SubstrateEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SubstrateEventFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Event]})
  kind!: SubstrateHandlerKind.Event;
  @IsString()
  handler!: string;
}

export class CustomHandler implements SubstrateCustomHandler {
  @IsString()
  kind!: string;
  @IsString()
  handler!: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class RuntimeMapping implements BaseMapping<SubstrateRuntimeHandler> {
  @Transform((params) => {
    const handlers: SubstrateRuntimeHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubstrateHandlerKind.Event:
          return plainToClass(EventHandler, handler);
        case SubstrateHandlerKind.Call:
          return plainToClass(CallHandler, handler);
        case SubstrateHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers!: SubstrateRuntimeHandler[];
  @IsString()
  file!: string;
}

export class CustomMapping implements BaseMapping<SubstrateCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers!: CustomHandler[];
  @IsString()
  file!: string;
}

export class RuntimeDataSourceBase extends BaseDataSource implements SubstrateRuntimeDatasource {
  @IsEnum(SubstrateDatasourceKind, {groups: [SubstrateDatasourceKind.Runtime]})
  kind!: SubstrateDatasourceKind.Runtime;
  @Type(() => RuntimeMapping)
  @ValidateNested()
  mapping!: RuntimeMapping;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file!: string;
}

export class CustomDataSourceBase<K extends string, M extends CustomMapping, O = any>
  extends BaseDataSource
  implements SubstrateCustomDatasource<K, M, O>
{
  @IsString()
  kind!: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping!: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets!: Map<string, FileReference>;
  @Type(() => ProcessorImpl)
  @IsObject()
  @ValidateNested()
  processor!: Processor<O>;
}
