// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {forbidNonWhitelisted} from '@subql/common';
import {
  StellarHandlerKind,
  StellarDatasourceKind,
  StellarEventFilter,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlHandler,
  SubqlRuntimeHandler,
  SubqlRuntimeDatasource,
  SubqlCustomDatasource,
  FileReference,
  CustomDataSourceAsset,
  SubqlEventHandler,
} from '@subql/types-stellar';
import {plainToClass, Transform, Type} from 'class-transformer';
import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';
import {SubqlStellarProcessorOptions} from './types';

export class EventFilter implements StellarEventFilter {
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
  filter?: StellarEventFilter;
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

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>> implements SubqlRuntimeDatasource<M> {
  @IsEnum(StellarDatasourceKind, {
    groups: [StellarDatasourceKind.Runtime],
  })
  kind: StellarDatasourceKind.Runtime;
  @Type(() => StellarMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
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
  options?: StellarProcessorOptions;
}
