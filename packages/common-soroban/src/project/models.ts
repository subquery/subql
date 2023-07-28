// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {forbidNonWhitelisted} from '@subql/common';
import {
  SorobanHandlerKind,
  SorobanDatasourceKind,
  SorobanEventFilter,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlHandler,
  SubqlRuntimeHandler,
  SubqlRuntimeDatasource,
  SubqlCustomDatasource,
  FileReference,
  CustomDataSourceAsset,
  SorobanBlockFilter,
  SorobanTransactionFilter,
  SorobanOperationFilter,
  SorobanEffectFilter,
  SubqlBlockHandler,
  SubqlTransactionHandler,
  SubqlOperationHandler,
  SubqlEffectHandler,
} from '@subql/types-soroban';
import {plainToClass, Transform, Type} from 'class-transformer';
import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';
import {Horizon, ServerApi} from 'stellar-sdk';
import {SubqlSorobanProcessorOptions} from './types';

export class BlockFilter implements SorobanBlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TransactionFilter implements SorobanTransactionFilter {
  @IsOptional()
  @IsString()
  account?: string;
}

export class OperationFilter implements SorobanOperationFilter {
  @IsOptional()
  type: Horizon.OperationResponseType;

  @IsOptional()
  @IsString()
  source_account?: string;
}

export class EffectFilter implements SorobanEffectFilter {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  account?: string;
}

export class BlockHandler implements SubqlBlockHandler {
  @IsObject()
  @IsOptional()
  @Type(() => BlockFilter)
  filter?: BlockFilter;
  @IsEnum(SorobanHandlerKind, {groups: [SorobanHandlerKind.Block]})
  kind: SorobanHandlerKind.Block;
  @IsString()
  handler: string;
}

export class TransactionHandler implements SubqlTransactionHandler {
  @IsObject()
  @IsOptional()
  @Type(() => TransactionFilter)
  filter?: TransactionFilter;
  @IsEnum(SorobanHandlerKind, {groups: [SorobanHandlerKind.Transaction]})
  kind: SorobanHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class OperationHandler implements SubqlOperationHandler {
  @IsObject()
  @IsOptional()
  @Type(() => OperationFilter)
  filter?: OperationFilter;
  @IsEnum(SorobanHandlerKind, {groups: [SorobanHandlerKind.Operation]})
  kind: SorobanHandlerKind.Operation;
  @IsString()
  handler: string;
}

export class EffectHandler implements SubqlEffectHandler {
  @IsObject()
  @IsOptional()
  @Type(() => EffectFilter)
  filter?: EffectFilter;
  @IsEnum(SorobanHandlerKind, {groups: [SorobanHandlerKind.Effects]})
  kind: SorobanHandlerKind.Effects;
  @IsString()
  handler: string;
}

/*
export class EventFilter implements SorobanEventFilter {
  @IsOptional()
  @IsString()
  contractId?: string;
  @IsOptional()
  @IsArray()
  topics?: string[];
}

export class EventHandler implements SubqlEventHandler {
  @forbidNonWhitelisted({topics: '', contractId: ''})
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SorobanEventFilter;
  @IsEnum(SorobanHandlerKind, {groups: [SorobanHandlerKind.Event]})
  kind: SorobanHandlerKind.Event;
  @IsString()
  handler: string;
}
*/

export class CustomHandler implements SubqlCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class SorobanMapping implements SubqlMapping {
  @Transform((params) => {
    const handlers: SubqlHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SorobanHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        case SorobanHandlerKind.Transaction:
          return plainToClass(TransactionHandler, handler);
        case SorobanHandlerKind.Operation:
          return plainToClass(OperationHandler, handler);
        case SorobanHandlerKind.Effects:
          return plainToClass(EffectHandler, handler);
        //case SorobanHandlerKind.Event:
        //  return plainToClass(EventHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlHandler[];
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

export class SorobanProcessorOptions implements SubqlSorobanProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  @IsString()
  address?: string;
}

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>> implements SubqlRuntimeDatasource<M> {
  @IsEnum(SorobanDatasourceKind, {
    groups: [SorobanDatasourceKind.Runtime],
  })
  kind: SorobanDatasourceKind.Runtime;
  @Type(() => SorobanMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @ValidateNested()
  @Type(() => SorobanProcessorOptions)
  options?: SorobanProcessorOptions;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>>
  implements SubqlCustomDatasource<K, M>
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
  @ValidateNested()
  options?: SorobanProcessorOptions;
}
