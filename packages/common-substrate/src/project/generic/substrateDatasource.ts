// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {FileReference, GenericDataSource, GenericHandler, GenericMapping, Processor} from '@subql/common';
import {SubstrateCustomDataSourceV0_2_0Impl, SubstrateRuntimeDataSourceV0_2_0Impl} from '@subql/common-substrate';
import {FileType, GenericHandlerImp, GenericMappingImp} from '@subql/common/project/versioned/genericManifest';
import {SubstrateBlockFilter, SubstrateHandlerKind} from '@subql/types';
import {Type} from 'class-transformer';
import {IsInt, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';

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
  filter: SubstrateBlockFilter;
  startBlock?: number;
}

export interface SubstrateCallHandler extends Partial<GenericHandler> {
  name?: string;
  kind: SubstrateHandlerKind.Block;
  filter: SubstrateBlockFilter;
  startBlock?: number;
}

export interface SubstrateEventHandler extends Partial<GenericHandler> {
  name?: string;
  kind: SubstrateHandlerKind.Block;
  filter: SubstrateBlockFilter;
  startBlock?: number;
}

export interface SubstrateCustomHandler extends Partial<GenericHandler> {
  kind: string;
  filter: Record<string, unknown>;
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

export class SubstrateRuntimeDataSourceImp<H = SubstrateHandler> extends SubstrateDataSourceBaseImp<H> {}

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
