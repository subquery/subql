// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';

import {BaseMapping, FileReference} from '@subql/common';
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
import {
  SubstrateCustomDataSourceAsset,
  SubstrateBlockFilter,
  SubstrateBlockHandler,
  SubstrateCallFilter,
  SubstrateCallHandler,
  SubstrateCustomHandler,
  SubstrateDatasourceKind,
  SubstrateEventFilter,
  SubstrateEventHandler,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateCustomDataSource,
  AvalancheBaseFilter,
  AvalancheHandler,
  AvalancheDataSource,
  AvalancheCallHandler,
  AvalancheEventHandler,
  AvalancheBlockHandler,
} from './types';

export class BlockFilter implements SubstrateBlockFilter {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  specVersion?: [number, number];
}

export class EventFilter extends BlockFilter implements SubstrateEventFilter {
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
}

export class BlockHandler implements AvalancheBlockHandler {
  @IsObject()
  @IsOptional()
  filter?: AvalancheBaseFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Block]})
  kind: SubstrateHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CallHandler implements AvalancheCallHandler {
  @IsObject()
  @IsOptional()
  filter?: AvalancheBaseFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Call]})
  kind: SubstrateHandlerKind.Call;
  @IsString()
  handler: string;
}

export class EventHandler implements AvalancheEventHandler {
  @IsObject()
  @IsOptional()
  filter?: AvalancheBaseFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Event]})
  kind: SubstrateHandlerKind.Event;
  @IsString()
  handler: string;
}

export class CustomHandler implements SubstrateCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class RuntimeMapping implements BaseMapping<AvalancheBaseFilter, AvalancheHandler> {
  @Transform((params) => {
    const handlers: AvalancheHandler[] = params.value;
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
  handlers: AvalancheHandler[];
  @IsString()
  file: string;
}

export class CustomMapping implements BaseMapping<Record<string, unknown>, SubstrateCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers: CustomHandler[];
  @IsString()
  file: string;
}

export class SubqlNetworkFilterImpl implements SubstrateNetworkFilter {
  @IsString()
  @IsOptional()
  specName?: string;
}

export class RuntimeDataSourceBase implements AvalancheDataSource {
  @IsEnum(SubstrateDatasourceKind, {groups: [SubstrateDatasourceKind.Runtime]})
  kind: SubstrateDatasourceKind.Runtime;
  @Type(() => RuntimeMapping)
  @ValidateNested()
  mapping: RuntimeMapping;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => SubqlNetworkFilterImpl)
  filter?: SubstrateNetworkFilter;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  options?: any;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, T extends SubstrateNetworkFilter, M extends CustomMapping, O = any>
  implements SubstrateCustomDataSource<K, T, O>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, SubstrateCustomDataSourceAsset>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor: FileReference;
  @IsOptional()
  @IsObject()
  filter?: T;
}
