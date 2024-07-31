// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BlockFilter,
  CommonSubqueryProject,
  IEndpointConfig,
  IProjectNetworkConfig,
  NodeOptions,
  NodeSpec,
  ParentProject,
  QuerySpec,
  RunnerSpecs,
} from '@subql/types-core';
import {Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsInt,
  Validate,
  ValidateNested,
  IsArray,
  IsNotEmpty,
  Allow,
  ValidateIf,
  IsPositive,
} from 'class-validator';
import {IsNetworkEndpoint, SemverVersionValidator} from '../../utils';
import {FileType} from '../base';

export class RunnerQueryBaseModel implements QuerySpec {
  @Equals('@subql/query')
  name!: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version!: string;
}

export class RunnerNodeImpl implements NodeSpec {
  @IsString()
  name!: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX,{message: 'runner version is not correct'})
  version!: string;
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerNodeOptionsModel)
  options?: NodeOptions;
}

export class RunnerNodeOptionsModel implements NodeOptions {
  @IsOptional()
  @IsBoolean()
  historical?: boolean;
  @IsOptional()
  @IsBoolean()
  unsafe?: boolean;
  @IsOptional()
  @IsBoolean()
  unfinalizedBlocks?: boolean;
  @IsOptional()
  @IsBoolean()
  skipTransactions?: boolean;
}

export class BlockFilterImpl implements BlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class ParentProjectModel implements ParentProject {
  @IsNumber()
  @ValidateIf((obj, value) => value !== null || obj.unitlBlock === null || obj.untilBlock === undefined)
  block!: number;
  @IsNumber()
  @ValidateIf((obj, value) => value !== null || obj.block === null || obj.block === undefined)
  untilBlock!: number;
  @IsString()
  reference!: string;
}

// Use for generic project validation only
export class CommonProjectManifestV1_0_0Impl<D extends object = any> implements CommonSubqueryProject {
  @Allow()
  definitions!: object;
  @IsString()
  @IsOptional()
  description?: string;
  @IsOptional()
  @IsString()
  repository?: string;
  @Equals('1.0.0')
  specVersion!: string;
  // To be validated in specific manifest type
  @IsArray()
  dataSources!: any[];
  @ValidateNested()
  @Type(() => CommonProjectNetworkV1_0_0)
  network!: IProjectNetworkConfig;
  @IsString()
  @IsOptional()
  name?: string;
  @IsString()
  version!: string;
  @ValidateNested()
  @Type(() => FileType)
  schema!: FileType;
  @IsOptional()
  @IsArray()
  templates?: any[];
  @IsObject()
  @ValidateNested()
  @Type(() => CommonRunnerSpecsImpl)
  runner!: RunnerSpecs;
  @IsOptional()
  @IsObject()
  @Type(() => ParentProjectModel)
  parent?: ParentProject;
  readonly deployment!: D;
}

export class CommonRunnerSpecsImpl implements RunnerSpecs {
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerNodeImpl)
  node!: NodeSpec;
  @IsObject()
  @ValidateNested()
  @Type(() => RunnerQueryBaseModel)
  query!: QuerySpec;
}

export class CommonEndpointConfig implements IEndpointConfig {
  @IsOptional()
  // Class validator doesn't have any way of validating records
  headers?: Record<string, string>;
}

export class CommonProjectNetworkV1_0_0<C = any> implements IProjectNetworkConfig {
  @IsOptional()
  @IsNetworkEndpoint(CommonEndpointConfig)
  endpoint!: string | string[] | Record<string, CommonEndpointConfig>;
  @IsString({each: true})
  @IsOptional()
  dictionary!: string | string[];
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  @IsString()
  chainId!: string;
  @IsOptional()
  chaintypes?: C; // ensure lowercase to keep consistency
  @IsOptional()
  @IsArray()
  bypassBlocks?: (number | `${number}-${number}`)[];
}
