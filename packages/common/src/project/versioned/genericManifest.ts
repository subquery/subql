// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {plainToClass, plainToClassFromExist, Transform, Type} from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {runnerMapping} from '../../constants';
import {
  GenericHandler,
  GenericTemplate,
  NetworkValidator,
  NodeSpec,
  QuerySpec,
  RunnerQueryBaseModel,
} from '../../project';
import {
  FileReference,
  GenericDataSource,
  GenericManifest,
  GenericMapping,
  Processor,
  GenericNetworkConfig,
} from '../types';
import {SemverVersionValidator} from '../utils';
import {RunnerSpecs} from '../versioned/v1_0_0/types';

export class GenericHandlerImp implements GenericHandler {
  @IsString()
  handler: string;
  @IsString()
  kind: string;
  @IsOptional()
  filter?: Record<string, unknown>;
}

export class GenericMappingImp<H extends object = GenericHandlerImp> {
  @IsArray()
  @Type(() => GenericHandlerImp)
  @ValidateNested()
  handlers: H[];
  @IsString()
  file: string;
}

export class GenericRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => GenericRunnerNodeImpl)
  node: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}

export class GenericRunnerNodeImpl implements NodeSpec {
  @IsIn(Object.keys(runnerMapping), {message: `Runner node name incorrect`})
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  version: string;
}

export class FileType implements FileReference {
  @IsString()
  file: string;
}

export class GenericDataSourceImp<H extends GenericHandlerImp, O> implements GenericDataSource<H> {
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  kind: string;
  // filter?: F; Abandon after project manifest 0.0.1
  @IsInt()
  @IsOptional()
  startBlock?: number;
  @Type(() => GenericMappingImp)
  @ValidateNested()
  mapping: GenericMapping<H>;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @Type(() => FileType)
  @IsObject()
  processor?: Processor<O>;
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>;
  @IsOptional()
  @IsObject()
  filter?: string;
}

export class GenericTemplateImp<H extends GenericHandlerImp, O> implements GenericTemplate<H> {
  @IsString()
  @IsOptional()
  name: string;
  @IsString()
  kind: string;
  // filter?: F; Abandon after project manifest 0.0.1
  @IsInt()
  @IsOptional()
  startBlock?: number;
  @Type(() => GenericMappingImp)
  @ValidateNested()
  mapping: GenericMapping<H>;
  @IsOptional()
  assets?: Map<string, FileReference>;
  @IsOptional()
  @Type(() => FileType)
  @IsObject()
  processor?: Processor<O>;
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>;
  @IsOptional()
  @IsObject()
  filter?: string;
}

export class GenericNetworkImp implements GenericNetworkConfig {
  @IsString()
  @IsOptional()
  endpoint?: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
  @IsOptional()
  @IsString()
  chainId: string;
  @IsString()
  @IsOptional()
  genesisHash?: string; // Only optional above 1.0.0
  @ValidateNested()
  @Type(() => FileType)
  @IsOptional()
  chaintypes?: FileReference;
  [otherOptions: string]: unknown; //for other chain
}

export class ProjectManifestImp<
  H extends GenericHandler = GenericHandler,
  N extends GenericNetworkConfig = GenericNetworkConfig,
  O = any
> implements GenericManifest<H, N>
{
  @ValidateIf((o) => o.specVersion === '1.0.0')
  @IsObject()
  @ValidateNested()
  @Type(() => GenericRunnerSpecsImpl)
  runner: RunnerSpecs;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsString()
  specVersion: string;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @IsArray()
  @ValidateNested()
  @Type(() => GenericDataSourceImp, {keepDiscriminatorProperty: true})
  dataSources: GenericDataSource<H, O>[];
  @ValidateNested()
  @Type(() => FileType)
  schema: FileReference | string;
  @Transform((params) => {
    return plainToClass(GenericNetworkImp, params.value);
  })
  @Validate(NetworkValidator)
  @ValidateNested()
  @Type(() => GenericNetworkImp)
  network: N;
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => GenericTemplateImp, {keepDiscriminatorProperty: true})
  templates: GenericTemplate<H, O>[];

  constructor(raw: any) {
    const manifest = raw as GenericManifest<H, N>;
    this.network = manifest.network;
    this.dataSources = manifest.dataSources.map((d) => {
      return plainToClass(GenericDataSourceImp, d, {enableImplicitConversion: true});
    });
  }

  toDeployment(): string {
    throw new Error('Method not implemented.');
  }
  validate(): void {
    const errors = validateSync(this, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}

export function parseGenericProjectManifest<
  H extends GenericHandler = GenericHandler,
  N extends GenericNetworkConfig = GenericNetworkConfig
>(raw: unknown): ProjectManifestImp<H, N> {
  const manifest = plainToClassFromExist(new ProjectManifestImp<H, N>(raw), raw);
  manifest.validate();
  return manifest;
}
