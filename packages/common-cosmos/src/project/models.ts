// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlCosmosEventFilter,
  SubqlCosmosHandlerKind,
  SubqlCosmosCustomHandler,
  SubqlCosmosMapping,
  SubqlCosmosHandler,
  SubqlCosmosRuntimeHandler,
  SubqlCosmosRuntimeDatasource,
  SubqlCosmosDatasourceKind,
  SubqlCosmosCustomDatasource,
  FileReference,
  CustomDataSourceAsset,
  SubqlCosmosBlockHandler,
  SubqlCosmosEventHandler,
  SubqlCosmosMessageFilter,
  SubqlCosmosTransactionHandler,
  SubqlCosmosMessageHandler,
  CustomModule,
} from '@subql/types-cosmos';

import {plainToClass, Transform, Type} from 'class-transformer';

import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested, ValidateIf} from 'class-validator';

export class CosmosMessageFilter implements SubqlCosmosMessageFilter {
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

export class CosmosEventFilter implements SubqlCosmosEventFilter {
  @IsString()
  type: string;
  @IsOptional()
  @Type(() => CosmosMessageFilter)
  messageFilter?: SubqlCosmosMessageFilter;
}

export class CosmosBlockHandler implements SubqlCosmosBlockHandler {
  @IsEnum(SubqlCosmosHandlerKind, {groups: [SubqlCosmosHandlerKind.Block]})
  kind: SubqlCosmosHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CosmosTransactionHandler implements SubqlCosmosTransactionHandler {
  @IsEnum(SubqlCosmosHandlerKind, {groups: [SubqlCosmosHandlerKind.Transaction]})
  kind: SubqlCosmosHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class CosmosMessageHandler implements SubqlCosmosMessageHandler {
  @IsEnum(SubqlCosmosHandlerKind, {groups: [SubqlCosmosHandlerKind.Message]})
  kind: SubqlCosmosHandlerKind.Message;
  @IsString()
  handler: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => CosmosMessageFilter)
  filter?: CosmosMessageFilter;
}

export class CosmosEventHandler implements SubqlCosmosEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CosmosEventFilter)
  filter?: SubqlCosmosEventFilter;
  @IsEnum(SubqlCosmosHandlerKind, {groups: [SubqlCosmosHandlerKind.Event]})
  kind: SubqlCosmosHandlerKind.Event;
  @IsString()
  handler: string;
}

export class CosmosCustomHandler implements SubqlCosmosCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class CosmosMapping implements SubqlCosmosMapping {
  @Transform((params) => {
    const handlers: SubqlCosmosHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlCosmosHandlerKind.Event:
          return plainToClass(CosmosEventHandler, handler);
        case SubqlCosmosHandlerKind.Message:
          return plainToClass(CosmosMessageHandler, handler);
        case SubqlCosmosHandlerKind.Transaction:
          return plainToClass(CosmosTransactionHandler, handler);
        case SubqlCosmosHandlerKind.Block:
          return plainToClass(CosmosBlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlCosmosHandler[];
  @IsString()
  file: string;
}

export class CosmosCustomMapping implements SubqlCosmosMapping<SubqlCosmosCustomHandler> {
  @IsArray()
  @Type(() => CosmosCustomHandler)
  @ValidateNested()
  handlers: CosmosCustomHandler[];
  @IsString()
  file: string;
}

export class CosmosRuntimeDataSourceBase<M extends SubqlCosmosMapping<SubqlCosmosRuntimeHandler>>
  implements SubqlCosmosRuntimeDatasource<M>
{
  @IsEnum(SubqlCosmosDatasourceKind, {groups: [SubqlCosmosDatasourceKind.Runtime]})
  kind: SubqlCosmosDatasourceKind.Runtime;
  @Type(() => CosmosMapping)
  @ValidateNested()
  mapping: M;
  @IsInt()
  startBlock: number;
  @Type(() => CosmosCustomModuleImpl)
  @ValidateNested({each: true})
  chainTypes: Map<string, CustomModule>;
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
  M extends SubqlCosmosMapping = SubqlCosmosMapping<SubqlCosmosCustomHandler>,
  O = any
> implements SubqlCosmosCustomDatasource<K, M, O>
{
  @IsString()
  kind: K;
  @Type(() => CosmosCustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => CosmosFileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => CosmosFileReferenceImpl)
  @IsObject()
  processor?: FileReference;
  @Type(() => CosmosCustomModuleImpl)
  @ValidateNested({each: true})
  chainTypes: Map<string, CustomModule>;
}
