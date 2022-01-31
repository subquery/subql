// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {
  CustomDataSourceAsset,
  FileReference,
  SubqlBlockFilter,
  SubqlCallFilter,
  SubqlCustomDatasource,
  SubqlCustomHandler,
  SubqlDatasourceKind,
  SubqlEventFilter,
  SubqlHandler,
  SubqlHandlerKind,
  SubqlMapping,
  SubqlNetworkFilter,
  SubqlRuntimeDatasource,
  SubqlRuntimeHandler,
} from '@subql/types';

import {
  SubqlTerraEventFilter,
  SubqlTerraHandlerKind,
  SubqlTerraCustomHandler,
  SubqlTerraMapping,
  SubqlTerraHandler,
  SubqlTerraRuntimeHandler,
  SubqlTerraRuntimeDatasource,
  SubqlTerraDatasourceKind,
  SubqlTerraCustomDatasource,
} from '@subql/types-terra';

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
  IsEthereumAddress,
} from 'class-validator';

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

export class TerraEventFilter implements SubqlTerraEventFilter {
  @IsString()
  type: string;
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
  @IsEnum(SubqlHandlerKind, {groups: [SubqlHandlerKind.Block]})
  kind: SubqlHandlerKind.Block;
  @IsString()
  handler: string;
}

export class TerraBlockHandler {
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Block]})
  kind: SubqlTerraHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: SubqlCallFilter;
  @IsEnum(SubqlHandlerKind, {groups: [SubqlHandlerKind.Call]})
  kind: SubqlHandlerKind.Call;
  @IsString()
  handler: string;
}

export class EventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SubqlEventFilter;
  @IsEnum(SubqlHandlerKind, {groups: [SubqlHandlerKind.Event]})
  kind: SubqlHandlerKind.Event;
  @IsString()
  handler: string;
}

export class TerraEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => TerraEventFilter)
  filter?: SubqlTerraEventFilter;
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Event]})
  kind: SubqlTerraHandlerKind.Event;
  @IsString()
  handler: string;
}

export class CustomHandler implements SubqlCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class TerraCustomHandler implements SubqlTerraCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class Mapping implements SubqlMapping {
  @Transform((params) => {
    const handlers: SubqlHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlHandlerKind.Event:
          return plainToClass(EventHandler, handler);
        case SubqlHandlerKind.Call:
          return plainToClass(CallHandler, handler);
        case SubqlHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlHandler[];
}

export class TerraMapping implements SubqlTerraMapping {
  @Transform((params) => {
    const handlers: SubqlTerraHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlTerraHandlerKind.Event:
          return plainToClass(TerraEventHandler, handler);
        case SubqlTerraHandlerKind.Block:
          return plainToClass(TerraBlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlTerraHandler[];
  @IsString()
  file: string;
}

export class CustomMapping implements SubqlMapping<SubqlCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers: CustomHandler[];
  @IsString()
  file: string;
}

export class TerraCustomMapping implements SubqlTerraMapping<SubqlTerraCustomHandler> {
  @IsArray()
  @Type(() => TerraCustomHandler)
  @ValidateNested()
  handlers: TerraCustomHandler[];
  @IsString()
  file: string;
}

export class SubqlNetworkFilterImpl implements SubqlNetworkFilter {
  @IsString()
  @IsOptional()
  specName?: string;
}

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>> implements SubqlRuntimeDatasource<M> {
  @IsEnum(SubqlDatasourceKind, {groups: [SubqlDatasourceKind.Runtime]})
  kind: SubqlDatasourceKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => SubqlNetworkFilterImpl)
  filter?: SubqlNetworkFilter;
}

export class TerraRuntimeDataSourceBase<M extends SubqlTerraMapping<SubqlTerraRuntimeHandler>>
  implements SubqlTerraRuntimeDatasource<M>
{
  @IsEnum(SubqlTerraDatasourceKind, {groups: [SubqlTerraDatasourceKind.Runtime]})
  kind: SubqlTerraDatasourceKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: M;
  @IsInt()
  startBlock: number;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class Processor<O = any> extends FileReferenceImpl {
  @IsOptional()
  @IsObject()
  options?: O;
}

export class CustomDataSourceBase<
  K extends string,
  T extends SubqlNetworkFilter,
  M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>,
  O = any
> implements SubqlCustomDatasource<K, T, M, O>
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
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor: FileReference;
  @IsOptional()
  @IsObject()
  filter?: T;
}

export class TerraCustomDataSourceBase<
  K extends string,
  M extends SubqlTerraMapping = SubqlTerraMapping<SubqlTerraCustomHandler>,
  O = any
> implements SubqlTerraCustomDatasource<K, M, O>
{
  @IsString()
  kind: K;
  @Type(() => TerraCustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor: FileReference;
}
