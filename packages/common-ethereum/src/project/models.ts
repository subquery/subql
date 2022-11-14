// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegisteredTypes, RegistryTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';

import {BaseMapping} from '@subql/common';
import {
  EthereumHandlerKind,
  EthereumDatasourceKind,
  EthereumLogFilter,
  SubqlCustomHandler,
  SubqlMapping,
  SubqlHandler,
  SubqlRuntimeHandler,
  SubqlRuntimeDatasource,
  SubqlCustomDatasource,
  FileReference,
  CustomDataSourceAsset,
  EthereumBlockFilter,
  SubqlBlockHandler,
  SubqlEventHandler,
  SubqlCallHandler,
  EthereumTransactionFilter,
  SubqlDatasource,
} from '@subql/types-ethereum';
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
} from 'class-validator';
import {SubqlEthereumDatasourceKind, SubqlEthereumHandlerKind} from './types';

export class BlockFilter implements EthereumBlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class LogFilter implements EthereumLogFilter {
  @IsOptional()
  @IsArray()
  topics?: string[];
  @IsOptional()
  @IsString()
  address?: string;
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

export class TransactionFilter implements EthereumTransactionFilter {
  @IsOptional()
  @IsString()
  from?: string;
  @IsOptional()
  @IsString()
  to?: string;
  @IsOptional()
  @IsString()
  function?: string;
}

export class BlockHandler implements SubqlBlockHandler {
  @IsObject()
  @IsOptional()
  @Type(() => BlockFilter)
  filter?: BlockFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.FlareBlock, SubqlEthereumHandlerKind.EthBlock]})
  kind: EthereumHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CallHandler implements SubqlCallHandler {
  @IsObject()
  @IsOptional()
  @Type(() => TransactionFilter)
  filter?: TransactionFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.FlareCall, SubqlEthereumHandlerKind.EthCall]})
  kind: EthereumHandlerKind.Call;
  @IsString()
  handler: string;
}

export class EventHandler implements SubqlEventHandler {
  @IsObject()
  @IsOptional()
  @Type(() => LogFilter)
  filter?: LogFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.FlareEvent, SubqlEthereumHandlerKind.EthEvent]})
  kind: EthereumHandlerKind.Event;
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

export class EthereumMapping implements SubqlMapping {
  @Transform((params) => {
    const handlers: SubqlHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlEthereumHandlerKind.FlareEvent:
          return plainToClass(EventHandler, handler);
        case SubqlEthereumHandlerKind.FlareCall:
          return plainToClass(CallHandler, handler);
        case SubqlEthereumHandlerKind.FlareBlock:
          return plainToClass(BlockHandler, handler);
        case SubqlEthereumHandlerKind.EthEvent:
          return plainToClass(EventHandler, handler);
        case SubqlEthereumHandlerKind.EthCall:
          return plainToClass(CallHandler, handler);
        case SubqlEthereumHandlerKind.EthBlock:
          return plainToClass(BlockHandler, handler);
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

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>> implements SubqlRuntimeDatasource<M> {
  @IsEnum(SubqlEthereumDatasourceKind, {
    groups: [SubqlEthereumDatasourceKind.FlareRuntime, SubqlEthereumDatasourceKind.EthRuntime],
  })
  kind: EthereumDatasourceKind.Runtime;
  @Type(() => EthereumMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  options?: any;
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
}
