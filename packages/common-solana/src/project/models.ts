// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlSolanaHandlerKind,
  SubqlSolanaCustomHandler,
  SubqlSolanaMapping,
  SubqlSolanaHandler,
  SubqlSolanaRuntimeHandler,
  SubqlSolanaRuntimeDatasource,
  SubqlSolanaDatasourceKind,
  SubqlSolanaCustomDatasource,
  FileReference,
  CustomDataSourceAsset,
} from '@subql/types-solana';

import {plainToClass, Transform, Type} from 'class-transformer';

import {IsArray, IsEnum, IsInt, IsOptional, IsString, IsObject, ValidateNested} from 'class-validator';


export class SolanaBlockHandler {
  @IsEnum(SubqlSolanaHandlerKind, {groups: [SubqlSolanaHandlerKind.Block]})
  kind: SubqlSolanaHandlerKind.Block;
  @IsString()
  handler: string;
}


export class SolanaCustomHandler implements SubqlSolanaCustomHandler {
  @IsString()
  kind: string;
  @IsString()
  handler: string;
  @IsObject()
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class SolanaMapping implements SubqlSolanaMapping {
  @Transform((params) => {
    const handlers: SubqlSolanaHandler[] = params.value;
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlSolanaHandlerKind.Block:
          return plainToClass(SolanaBlockHandler, handler);
        default:
          throw new Error(`handler ${(handler as any).kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlSolanaHandler[];
  @IsString()
  file: string;
}

export class SolanaCustomMapping implements SubqlSolanaMapping<SubqlSolanaCustomHandler> {
  @IsArray()
  @Type(() => SolanaCustomHandler)
  @ValidateNested()
  handlers: SolanaCustomHandler[];
  @IsString()
  file: string;
}

export class SolanaRuntimeDataSourceBase<M extends SubqlSolanaMapping<SubqlSolanaRuntimeHandler>>
  implements SubqlSolanaRuntimeDatasource<M>
{
  @IsEnum(SubqlSolanaDatasourceKind, {groups: [SubqlSolanaDatasourceKind.Runtime]})
  kind: SubqlSolanaDatasourceKind.Runtime;
  @Type(() => SolanaMapping)
  @ValidateNested()
  mapping: M;
  @IsInt()
  startBlock: number;
}

export class SolanaFileReferenceImpl implements FileReference {
  @IsString()
  file: string;
}

export class SolanaCustomDataSourceBase<
  K extends string,
  M extends SubqlSolanaMapping = SubqlSolanaMapping<SubqlSolanaCustomHandler>,
  O = any
> implements SubqlSolanaCustomDatasource<K, M, O>
{
  @IsString()
  kind: K;
  @Type(() => SolanaCustomMapping)
  @ValidateNested()
  mapping: M;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @Type(() => SolanaFileReferenceImpl)
  @ValidateNested({each: true})
  assets: Map<string, CustomDataSourceAsset>;
  @Type(() => SolanaFileReferenceImpl)
  @IsObject()
  processor: FileReference;
}
