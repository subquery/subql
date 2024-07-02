// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, forbidNonWhitelisted, ProcessorImpl} from '@subql/common';
import {Processor, FileReference} from '@subql/types-core';
import {
  StellarHandlerKind,
  StellarDatasourceKind,
  SorobanEventFilter,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlHandler,
  SubqlRuntimeHandler,
  SubqlRuntimeDatasource,
  SubqlCustomDatasource,
  CustomDataSourceAsset,
  StellarBlockFilter,
  StellarTransactionFilter,
  StellarOperationFilter,
  StellarEffectFilter,
  SubqlBlockHandler,
  SubqlTransactionHandler,
  SubqlOperationHandler,
  SubqlEffectHandler,
  SubqlEventHandler,
  SubqlSorobanTransactionHandler,
} from '@subql/types-stellar';
import {plainToClass, Transform, Type} from 'class-transformer';
import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';
import {HorizonApi} from 'stellar-sdk/lib/horizon';
import {SubqlStellarProcessorOptions} from './types';

export class BlockFilter implements StellarBlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TransactionFilter implements StellarTransactionFilter {
  @IsOptional()
  @IsString()
  account?: string;
}

export class OperationFilter implements StellarOperationFilter {
  @IsOptional()
  type: HorizonApi.OperationResponseType;

  @IsOptional()
  @IsString()
  source_account?: string;
}

export class EffectFilter implements StellarEffectFilter {
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
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.Block]})
  kind: StellarHandlerKind.Block;
  @IsString()
  handler: string;
}

export class TransactionHandler implements SubqlTransactionHandler {
  @forbidNonWhitelisted({account: ''})
  @IsObject()
  @IsOptional()
  @Type(() => TransactionFilter)
  filter?: TransactionFilter;
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.Transaction]})
  kind: StellarHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class SorobanTransactionHandler implements SubqlSorobanTransactionHandler {
  @forbidNonWhitelisted({account: ''})
  @IsObject()
  @IsOptional()
  @Type(() => TransactionFilter)
  filter?: TransactionFilter;
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.SorobanTransaction]})
  kind: StellarHandlerKind.SorobanTransaction;
  @IsString()
  handler: string;
}

export class OperationHandler implements SubqlOperationHandler {
  @forbidNonWhitelisted({type: '', sourceAccount: ''})
  @IsObject()
  @IsOptional()
  @Type(() => OperationFilter)
  filter?: OperationFilter;
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.Operation]})
  kind: StellarHandlerKind.Operation;
  @IsString()
  handler: string;
}

export class EffectHandler implements SubqlEffectHandler {
  @forbidNonWhitelisted({type: '', account: ''})
  @IsObject()
  @IsOptional()
  @Type(() => EffectFilter)
  filter?: EffectFilter;
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.Effects]})
  kind: StellarHandlerKind.Effects;
  @IsString()
  handler: string;
}

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
  @IsEnum(StellarHandlerKind, {groups: [StellarHandlerKind.Event]})
  kind: StellarHandlerKind.Event;
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

export class StellarMapping implements SubqlMapping {
  @Transform((params) => {
    const handlers: SubqlHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case StellarHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        case StellarHandlerKind.Transaction:
          return plainToClass(TransactionHandler, handler);
        case StellarHandlerKind.SorobanTransaction:
          return plainToClass(SorobanTransactionHandler, handler);
        case StellarHandlerKind.Operation:
          return plainToClass(OperationHandler, handler);
        case StellarHandlerKind.Effects:
          return plainToClass(EffectHandler, handler);
        case StellarHandlerKind.Event:
          return plainToClass(EventHandler, handler);
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

export class StellarProcessorOptions implements SubqlStellarProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  @IsString()
  address?: string;
}

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>>
  extends BaseDataSource
  implements SubqlRuntimeDatasource<M>
{
  @IsEnum(StellarDatasourceKind, {
    groups: [StellarDatasourceKind.Runtime],
  })
  kind: StellarDatasourceKind.Runtime;
  @Type(() => StellarMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @ValidateNested()
  @Type(() => StellarProcessorOptions)
  options?: StellarProcessorOptions;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>, O = any>
  extends BaseDataSource
  implements SubqlCustomDatasource<K, M, O>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number = undefined;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => ProcessorImpl)
  @IsObject()
  processor: Processor<O>;
  @IsOptional()
  @ValidateNested()
  options?: StellarProcessorOptions;
}
