// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
  FileReference,
  CustomDataSourceAsset,
  SubqlTerraBlockHandler,
  SubqlTerraEventHandler,
  SubqlTerraMessageFilter,
  SubqlTerraTransactionHandler,
  SubqlTerraMessageHandler,
} from '@subql/types-terra';

import {plainToClass, Transform, Type} from 'class-transformer';

import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';

export class TerraMessageFilter implements SubqlTerraMessageFilter {
  @IsString()
  type: string;
  @IsOptional()
  @IsObject()
  values?: {[key: string]: string};
}

export class TerraEventFilter implements SubqlTerraEventFilter {
  @IsString()
  type: string;
  @IsOptional()
  @Type(() => TerraMessageFilter)
  messageFilter?: SubqlTerraMessageFilter;
}

export class TerraBlockHandler implements SubqlTerraBlockHandler {
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Block]})
  kind: SubqlTerraHandlerKind.Block;
  @IsString()
  handler: string;
}

export class TerraTransactionHandler implements SubqlTerraTransactionHandler {
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Transaction]})
  kind: SubqlTerraHandlerKind.Transaction;
  @IsString()
  handler: string;
}

export class TerraMessageHandler implements SubqlTerraMessageHandler {
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Message]})
  kind: SubqlTerraHandlerKind.Message;
  @IsString()
  handler: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => TerraMessageFilter)
  filter?: TerraMessageFilter;
}

export class TerraEventHandler implements SubqlTerraEventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => TerraEventFilter)
  filter?: SubqlTerraEventFilter;
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Event]})
  kind: SubqlTerraHandlerKind.Event;
  @IsString()
  handler: string;
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

export class TerraMapping implements SubqlTerraMapping {
  @Transform((params) => {
    const handlers: SubqlTerraHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlTerraHandlerKind.Event:
          return plainToClass(TerraEventHandler, handler);
        case SubqlTerraHandlerKind.Message:
          return plainToClass(TerraMessageHandler, handler);
        case SubqlTerraHandlerKind.Transaction:
          return plainToClass(TerraTransactionHandler, handler);
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

export class TerraCustomMapping implements SubqlTerraMapping<SubqlTerraCustomHandler> {
  @IsArray()
  @Type(() => TerraCustomHandler)
  @ValidateNested()
  handlers: TerraCustomHandler[];
  @IsString()
  file: string;
}

export class TerraRuntimeDataSourceBase<M extends SubqlTerraMapping<SubqlTerraRuntimeHandler>>
  implements SubqlTerraRuntimeDatasource<M>
{
  @IsEnum(SubqlTerraDatasourceKind, {groups: [SubqlTerraDatasourceKind.Runtime]})
  kind: SubqlTerraDatasourceKind.Runtime;
  @Type(() => TerraMapping)
  @ValidateNested()
  mapping: M;
  @IsInt()
  startBlock: number;
}

export class TerraFileReferenceImpl implements FileReference {
  @IsString()
  file: string;
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
  @Type(() => TerraFileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => TerraFileReferenceImpl)
  @IsObject()
  processor: FileReference;
}
