// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '@subql/common';
import {FileReference} from '@subql/types-core';
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
  CustomDataSourceAsset,
  EthereumBlockFilter,
  SubqlBlockHandler,
  SubqlEventHandler,
  SubqlCallHandler,
  EthereumTransactionFilter,
} from '@subql/types-ethereum';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  IsEthereumAddress,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {SubqlEthereumDatasourceKind, SubqlEthereumHandlerKind, SubqlEthereumProcessorOptions} from './types';
import {IsEthereumOrZilliqaAddress} from './utils';

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
  function?: string | null;
}

export function forbidNonWhitelisted(keys: any, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'forbidNonWhitelisted',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const isValid = !Object.keys(value).some((key) => !(key in keys));
          if (!isValid) {
            throw new Error(
              `Invalid keys present in value: ${JSON.stringify(value)}. Whitelisted keys: ${JSON.stringify(
                Object.keys(keys)
              )}`
            );
          }
          return isValid;
        },
      },
    });
  };
}

export class BlockHandler implements SubqlBlockHandler {
  @IsObject()
  @IsOptional()
  @Type(() => BlockFilter)
  filter?: BlockFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.EthBlock]})
  kind: EthereumHandlerKind.Block;
  @IsString()
  handler: string;
}

export class CallHandler implements SubqlCallHandler {
  @forbidNonWhitelisted({from: '', to: '', function: ''})
  @IsOptional()
  @ValidateNested()
  @Type(() => TransactionFilter)
  filter?: EthereumTransactionFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.EthCall]})
  kind: EthereumHandlerKind.Call;
  @IsString()
  handler: string;
}

export class EventHandler implements SubqlEventHandler {
  @forbidNonWhitelisted({topics: ''})
  @IsOptional()
  @ValidateNested()
  @Type(() => LogFilter)
  filter?: EthereumLogFilter;
  @IsEnum(SubqlEthereumHandlerKind, {groups: [SubqlEthereumHandlerKind.EthEvent]})
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

export class EthereumProcessorOptions implements SubqlEthereumProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  @IsEthereumOrZilliqaAddress()
  address?: string;
}

export class RuntimeDataSourceBase<M extends SubqlMapping<SubqlRuntimeHandler>>
  extends BaseDataSource
  implements SubqlRuntimeDatasource<M>
{
  @IsEnum(SubqlEthereumDatasourceKind, {
    groups: [SubqlEthereumDatasourceKind.EthRuntime],
  })
  kind: EthereumDatasourceKind.Runtime;
  @Type(() => EthereumMapping)
  @ValidateNested()
  mapping: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @ValidateNested()
  @Type(() => EthereumProcessorOptions)
  options?: EthereumProcessorOptions;
}

export class FileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class CustomDataSourceBase<K extends string, M extends SubqlMapping = SubqlMapping<SubqlCustomHandler>>
  extends BaseDataSource
  implements SubqlCustomDatasource<K, M>
{
  @IsString()
  kind: K;
  @Type(() => CustomMapping)
  @ValidateNested()
  mapping: M;
  @Type(() => FileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => FileReferenceImpl)
  @IsObject()
  processor: FileReference;
  @IsOptional()
  @ValidateNested()
  options?: EthereumProcessorOptions;
}
