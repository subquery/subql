// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Validate,
  ValidateNested,
  equals,
} from 'class-validator';
import {RUNNER_REGEX} from '../../../constants';
import {SemverVersionValidator} from '../../utils';
import {NodeOptions, NodeSpec, ProjectManifestParentV1_0_0, QuerySpec} from './types';

export class RunnerQueryBaseModel implements QuerySpec {
  @Equals('@subql/query')
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version: string;
}

export class RunnerNodeImpl implements NodeSpec {
  @IsString()
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX,{message: 'runner version is not correct'})
  version: string;
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
}

export class ProjectManifestParentV1_0_0Model implements ProjectManifestParentV1_0_0 {
  @Equals('1.0.0')
  specVersion: string;
  @IsString({each: true})
  projects: string[];
  @IsObject()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}
