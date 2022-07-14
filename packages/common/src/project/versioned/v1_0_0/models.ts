// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Transform, TransformFnParams, Type} from 'class-transformer';
import {
  Allow,
  Equals,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  validateSync,
} from 'class-validator';
import {runnerMapping} from '../../../constants';
import {GenericDatasource} from '../../types';
import {SemverVersionValidator} from '../../utils';
import {GenericDataSourceV0_2_0Impl, GenericFileReferenceImpl} from '../v0_2_0';
import {GenericDatasourceTemplate, GenericDatasourceTemplateImpl} from '../v0_2_1';
import {RunnerSpecs, NodeSpec, QuerySpec, ProjectManifestV1_0_0} from './types';

export class RunnerQueryBaseModel implements QuerySpec {
  @Equals('@subql/query')
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version: string;
}

export class ProjectNetworkDeploymentV1_0_0 {
  @IsString()
  @IsNotEmpty()
  @Transform(({value}: TransformFnParams) => value.trim())
  chainId: string;
  @IsString()
  @IsOptional()
  @Transform(({value}: TransformFnParams) => value.trim())
  genesisHash?: string;
  @ValidateNested()
  @Type(() => GenericFileReferenceImpl)
  @IsOptional()
  chaintypes?: GenericFileReferenceImpl;
  @IsString()
  @IsOptional()
  @Transform(({value}: TransformFnParams) => value.trim())
  subnet?: string;
}
export class ProjectNetworkV1_0_0 extends ProjectNetworkDeploymentV1_0_0 {
  @IsString()
  @IsOptional()
  endpoint?: string;
  @IsString()
  @IsOptional()
  dictionary?: string;
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

export class GenericDataSourceV1_0_0Impl extends GenericDataSourceV0_2_0Impl {
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>[];
}

export class GenericDatasourceTemplate1_0_0Impl extends GenericDatasourceTemplateImpl {
  @IsObject()
  @IsOptional()
  options?: Record<string, unknown>[];
}

export class GenericProjectManifestV1_0_0Impl implements ProjectManifestV1_0_0 {
  @Allow()
  definitions: object;
  @IsString()
  description: string;
  @IsString()
  repository: string;
  @Equals('1.0.0')
  specVersion: string;
  @IsString()
  name: string;
  @IsString()
  version: string;
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectNetworkV1_0_0)
  network: ProjectNetworkV1_0_0;
  @ValidateNested()
  @Type(() => GenericFileReferenceImpl)
  schema: GenericFileReferenceImpl;
  @IsArray()
  @ValidateNested()
  @Type(() => GenericDataSourceV1_0_0Impl)
  dataSources: GenericDatasource[];
  @IsOptional()
  @IsArray()
  @ValidateNested()
  @Type(() => GenericDatasourceTemplate1_0_0Impl)
  templates?: GenericDatasourceTemplate[];
  @IsObject()
  @ValidateNested()
  @Type(() => GenericRunnerSpecsImpl)
  runner: RunnerSpecs;

  validate(): void {
    const errors = validateSync(this, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    }
  }
}
