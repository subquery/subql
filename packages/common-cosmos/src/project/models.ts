// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProcessorImpl} from '@subql/common';
import {FileReference, Processor} from '@subql/types-core';
import {
  CosmosEventFilter,
  CosmosHandlerKind,
  CosmosCustomHandler,
  CosmosMapping,
  CosmosHandler,
  CosmosRuntimeHandler,
  CosmosRuntimeDatasource,
  CosmosDatasourceKind,
  CosmosCustomDatasource,
  CustomDataSourceAsset,
  CosmosBlockFilter,
  CosmosBlockHandler,
  CosmosEventHandler,
  CosmosMessageFilter,
  CosmosTransactionHandler,
  CosmosMessageHandler,
  CustomModule,
  CosmosTxFilter,
  SubqlCosmosProcessorOptions,
} from '@subql/types-cosmos';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  ValidateIf,
  IsBoolean,
  Validate,
} from 'class-validator';
import {FileReferenceImp} from './utils';

export class BlockFilter implements CosmosBlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TxFilter implements CosmosTxFilter {
  @IsOptional()
  @IsBoolean()
  includeFailedTx?: boolean;
}

export class MessageFilter extends TxFilter implements CosmosMessageFilter {
  @IsString()
  type: string;
  @IsOptional()
  @IsObject()
  values?: {[key: string]: string};
  @ValidateIf((o) => o.type === '/cosmwasm.wasm.v1.MsgExecuteContract')
  @IsOptional()
  @IsString()
  contractCall?: string;
}

export class EventFilter implements CosmosEventFilter {
  @IsString()
  type: string;
  @IsOptional()
  @Type(() => MessageFilter)
  messageFilter?: CosmosMessageFilter;
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number>;
}

export class BlockHandler implements CosmosBlockHandler {
  @IsEnum(CosmosHandlerKind, {groups: [CosmosHandlerKind.Block]})
  kind: CosmosHandlerKind.Block;
  @IsString()
  handler: string;
  @IsOptional()
  @Type(() => BlockFilter)
  filter?: CosmosBlockFilter;
}

export class TransactionHandler implements CosmosTransactionHandler {
  @IsEnum(CosmosHandlerKind, {groups: [CosmosHandlerKind.Transaction]})
  kind: CosmosHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class MessageHandler implements CosmosMessageHandler {
  @IsEnum(CosmosHandlerKind, {groups: [CosmosHandlerKind.Message]})
  kind: CosmosHandlerKind.Message;
  @IsString()
  handler: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => MessageFilter)
  filter?: CosmosMessageFilter;
}

export class EventHandler implements CosmosEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: CosmosEventFilter;
  @IsEnum(CosmosHandlerKind, {groups: [CosmosHandlerKind.Event]})
  kind: CosmosHandlerKind.Event;
  @IsString()
  handler: string;
}

export class CustomHandler implements CosmosCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class RuntimeMapping implements CosmosMapping {
  @Transform((params) => {
    const handlers: CosmosHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case CosmosHandlerKind.Event:
          return plainToClass(EventHandler, handler);
        case CosmosHandlerKind.Message:
          return plainToClass(MessageHandler, handler);
        case CosmosHandlerKind.Transaction:
          return plainToClass(TransactionHandler, handler);
        case CosmosHandlerKind.Block:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: CosmosHandler[];
  @IsString()
  file: string;
}

export class CustomMapping implements CosmosMapping<CosmosCustomHandler> {
  @IsArray()
  @Type(() => CustomHandler)
  @ValidateNested()
  handlers: CosmosCustomHandler[];
  @IsString()
  file: string;
}

export class CosmosProcessorOptions implements CosmosProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
}

export class CosmosRuntimeDataSourceBase<M extends CosmosMapping<CosmosRuntimeHandler>>
  implements CosmosRuntimeDatasource<M>
{
  @IsEnum(CosmosDatasourceKind, {groups: [CosmosDatasourceKind.Runtime]})
  kind: CosmosDatasourceKind.Runtime;
  @Type(() => RuntimeMapping)
  @ValidateNested()
  mapping: M;
  @IsInt()
  startBlock: number;
  @IsOptional()
  @Validate(FileReferenceImp)
  assets?: Map<string, FileReference>;
  @IsOptional()
  @Type(() => CosmosProcessorOptions)
  @ValidateNested()
  options?: CosmosProcessorOptions;
}

export class CosmosFileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CosmosCustomModuleImpl implements CustomModule {
  @IsString()
  file: string;
  @IsArray()
  @Type(() => String)
  messages: string[];
}

export class CosmosCustomDataSourceBase<
  K extends string,
  M extends CosmosMapping = CosmosMapping<CosmosCustomHandler>,
  O = any
> implements CosmosCustomDatasource<K, M, O>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => CosmosFileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => ProcessorImpl)
  @IsObject()
  processor: Processor<O>;
}
