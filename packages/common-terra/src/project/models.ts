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
  SubqlTerraCallHandler,
  SubqlTerraCallFilter,
} from '@subql/types-terra';

import {plainToClass, Transform, Type} from 'class-transformer';

import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';

export class TerraEventFilter implements SubqlTerraEventFilter {
  @IsOptional()
  @IsString()
  contract?: string;
  @IsString()
  type: string;
}

export class TerraCallFilter implements SubqlTerraCallFilter {
  @IsOptional()
  @IsString()
  contract?: string;
  @IsOptional()
  @IsString()
  function?: string;
  @IsOptional()
  @IsString()
  from?: string;
}

export class TerraBlockHandler implements SubqlTerraBlockHandler {
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Block]})
  kind: SubqlTerraHandlerKind.Block;
  @IsString()
  handler: string;
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

export class TerraCallHandler implements SubqlTerraCallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => TerraCallFilter)
  filter?: SubqlTerraCallFilter;
  @IsEnum(SubqlTerraHandlerKind, {groups: [SubqlTerraHandlerKind.Call]})
  kind: SubqlTerraHandlerKind.Call;
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
        case SubqlTerraHandlerKind.Call:
          return plainToClass(TerraCallHandler, handler);
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
