// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {RegistryTypes, RegisteredTypes, OverrideModuleType, OverrideBundleType} from '@polkadot/types/types';
import {plainToClass, Transform, Type} from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {SubqlKind} from './constants';
import {
  ProjectManifestV0_0_1,
  ProjectManifestV0_0_2,
  SubqlBlockFilter,
  SubqlCallFilter,
  SubqlEventFilter,
  SubqlNetworkFilter,
  SubqlHandler,
  SubqlMapping,
  SubqlRuntimeDatasource,
  ProjectManifestBase,
} from './types';

export class ProjectNetworkV0_0_1 implements RegisteredTypes {
  @IsString()
  endpoint: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
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

export class FileType {
  @IsString()
  file: string;
}

export class ProjectNetworkV0_0_2 {
  @IsString()
  genesisHash: string;

  @IsObject()
  @ValidateNested()
  @Type(() => FileType)
  chaintypes: FileType;
}

export class ProjectManifestBaseImpl implements ProjectManifestBase {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsString()
  specVersion: string;
  @IsArray()
  @ValidateNested()
  @Type(() => RuntimeDataSource)
  dataSources: RuntimeDataSource[];
}

export class ProjectManifestV0_0_1Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_0_1 {
  @Equals('0.0.1')
  specVersion: string;
  @ValidateNested()
  @Type(() => ProjectNetworkV0_0_1)
  @IsObject()
  network: ProjectNetworkV0_0_1;
  @IsString()
  schema: string;
}

export class ProjectManifestV0_0_2Impl extends ProjectManifestBaseImpl implements ProjectManifestV0_0_2 {
  @Equals('0.2.0')
  specVersion: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV0_0_2)
  network: ProjectNetworkV0_0_2;
  @IsObject()
  @ValidateNested()
  @Type(() => FileType)
  schema: FileType;
}

export class BlockFilter implements SubqlBlockFilter {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2)
  specVersion?: [number, number];
}

export class EventFilter extends BlockFilter implements SubqlEventFilter {
  @IsOptional()
  @IsString()
  module?: string;
  @IsOptional()
  @IsString()
  method?: string;
}

export class NetworkFilter implements SubqlNetworkFilter {
  @IsString()
  specName: string;
}

export class CallFilter extends EventFilter implements SubqlCallFilter {
  @IsOptional()
  @IsBoolean()
  success?: boolean;
}

export class BlockHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => BlockFilter)
  filter?: SubqlBlockFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.BlockHandler]})
  kind: SubqlKind.BlockHandler;
  @IsString()
  handler: string;
}

export class CallHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => CallFilter)
  filter?: SubqlCallFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.CallHandler]})
  kind: SubqlKind.CallHandler;
  @IsString()
  handler: string;
}

export class EventHandler {
  @IsOptional()
  @ValidateNested()
  @Type(() => EventFilter)
  filter?: SubqlEventFilter;
  @IsEnum(SubqlKind, {groups: [SubqlKind.EventHandler]})
  kind: SubqlKind.EventHandler;
  @IsString()
  handler: string;
}

export class Mapping implements SubqlMapping {
  @Transform((handlers: SubqlHandler[]) => {
    return handlers.map((handler) => {
      switch (handler.kind) {
        case SubqlKind.EventHandler:
          return plainToClass(EventHandler, handler);
        case SubqlKind.CallHandler:
          return plainToClass(CallHandler, handler);
        case SubqlKind.BlockHandler:
          return plainToClass(BlockHandler, handler);
        default:
          throw new Error(`handler ${handler.kind} not supported`);
      }
    });
  })
  @IsArray()
  @ValidateNested()
  handlers: SubqlHandler[];
}

export class RuntimeDataSource implements SubqlRuntimeDatasource {
  @IsEnum(SubqlKind, {groups: [SubqlKind.Runtime]})
  kind: SubqlKind.Runtime;
  @Type(() => Mapping)
  @ValidateNested()
  mapping: SubqlMapping;
  @IsString()
  name: string;
  @IsOptional()
  @IsInt()
  startBlock?: number;
  @IsOptional()
  @ValidateNested()
  @Type(() => NetworkFilter)
  filter?: SubqlNetworkFilter;
}
