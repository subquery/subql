// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Type} from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsInt,
  Matches,
  Validate,
  ValidateNested,
} from 'class-validator';
import {RUNNER_REGEX} from '../../../constants';
import {SemverVersionValidator} from '../../utils';
import {BlockFilter, NodeOptions, NodeSpec, ParentProject, QuerySpec} from './types';

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
  block: number;
  @IsString()
  reference: string;
}
