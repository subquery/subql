// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  FileReference,
  GenericDataSource,
  GenericHandler,
  GenericHandlerImp,
  GenericMapping,
  Processor,
} from '@subql/common';
import {
  BlockFilter,
  CallFilter,
  EventFilter,
  SubstrateCallFilter,
  SubstrateEventFilter,
  SubstrateRuntimeHandler,
} from '@subql/common-substrate';
import {FileType, GenericMappingImp} from '@subql/common/project/versioned/genericManifest';
import {SubstrateBlockFilter, SubstrateHandlerKind} from '@subql/types';
import {plainToClass, Transform, Type} from 'class-transformer';
import {IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';

export interface SubstrateDataSourceBase<H> extends Partial<GenericDataSource<H>> {
  name?: string;
  kind: string;
  mapping: GenericMapping<H>;
  // filter?: F; Abandon after project manifest 0.0.1
  startBlock?: number;
}
//TODO, replace with @subql/type
export interface SubstrateBlockHandler extends Partial<GenericHandler> {
  name?: string;
  kind: SubstrateHandlerKind.Block;
  filter?: SubstrateBlockFilter;
  startBlock?: number;
}

export interface SubstrateCallHandler extends Partial<GenericHandler> {
  name?: string;
  kind: SubstrateHandlerKind.Call;
  filter?: SubstrateCallFilter;
  startBlock?: number;
}

export interface SubstrateEventHandler extends Partial<GenericHandler> {
  name?: string;
  kind: SubstrateHandlerKind.Event;
  filter?: SubstrateEventFilter;
  startBlock?: number;
}

export interface SubstrateCustomHandler extends Partial<GenericHandler> {
  kind: string;
  filter?: Record<string, unknown>;
  startBlock?: number;
}

export type SubstrateHandler =
  | SubstrateBlockHandler
  | SubstrateEventHandler
  | SubstrateEventHandler
  | SubstrateCustomHandler;

// H need to be runtime handler
export type SubstrateRuntimeDataSource<H = SubstrateBlockHandler | SubstrateEventHandler | SubstrateEventHandler> =
  SubstrateDataSourceBase<H>;

// H need to be custom handler
export interface SubstrateCustomDataSource<H = SubstrateCustomHandler, O = any> extends SubstrateDataSourceBase<H> {
  assets?: Map<string, FileReference>;
  processor?: Processor<O>;
  options?: Record<string, unknown>;
}

export class SubstrateDataSourceBaseImp<H = SubstrateHandler> implements SubstrateDataSourceBase<H> {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  kind: string;
  @IsInt()
  @IsOptional()
  startBlock?: number;
  @Type(() => GenericMappingImp)
  @ValidateNested()
  mapping: GenericMapping<H>;
}

export class SubstrateTemplateBaseImp<H = SubstrateHandler> extends SubstrateDataSourceBaseImp<H> {
  @IsString()
  name: string;
}

export class SubstrateBlockHandlerImp implements SubstrateBlockHandler {
  name?: string;
  startBlock?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockFilter)
  filter?: SubstrateBlockFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Block]})
  kind: SubstrateHandlerKind.Block;
  @IsString()
  handler: string;
}

export class SubstrateCallHandlerImp implements SubstrateCallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: SubstrateCallFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Call]})
  kind: SubstrateHandlerKind.Call;
  @IsString()
  handler: string;
}

export class SubstrateEventHandlerImp implements SubstrateEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SubstrateEventFilter;
  @IsEnum(SubstrateHandlerKind, {groups: [SubstrateHandlerKind.Event]})
  kind: SubstrateHandlerKind.Event;
  @IsString()
  handler: string;
}

export class SubstrateCustomHandlerImp implements SubstrateCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class SubstrateRuntimeMappingImp<H = SubstrateBlockHandler | SubstrateEventHandler | SubstrateCallHandler>
  implements GenericMapping<H>
{
  @Transform((params) => {
    const handlers: SubstrateRuntimeHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubstrateHandlerKind.Event:
          return plainToClass(SubstrateEventHandlerImp, handler);
        case SubstrateHandlerKind.Call:
          return plainToClass(SubstrateCallHandlerImp, handler);
        case SubstrateHandlerKind.Block:
          return plainToClass(SubstrateBlockHandlerImp, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @Type(() => GenericHandlerImp)
  @IsArray()
  @ValidateNested()
  handlers: H[];
  @IsString()
  file: string;
}

export class SubstrateRuntimeDataSourceImp<
  H = SubstrateBlockHandler | SubstrateEventHandler | SubstrateCallHandler
> extends SubstrateDataSourceBaseImp<H> {
  @Type(() => SubstrateRuntimeMappingImp)
  @ValidateNested()
  mapping: GenericMapping<H>;
}

export class SubstrateCustomDataSourceImp<H = SubstrateCustomHandler, O = any> extends SubstrateDataSourceBaseImp<H> {
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @Type(() => FileType)
  @IsObject()
  processor?: Processor<O>;
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>;
  @IsOptional()
  @IsObject()
  filter?: string;
}

export class SubstrateRuntimeTemplateImp<H> extends SubstrateRuntimeDataSourceImp<H> {
  @IsString()
  name: string;
}

export class SubstrateCustomTemplateImp<H, O> extends SubstrateCustomDataSourceImp<H, O> {
  @IsString()
  name: string;
}
