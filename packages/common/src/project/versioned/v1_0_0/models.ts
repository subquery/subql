// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SemverVersionValidator} from '@subql/common/project';
import {Equals, IsString, Validate, Matches} from 'class-validator';
import {RUNNER_REGEX} from '../../../constants';
import {QuerySpec} from './types';

export class RunnerQueryBaseModel implements QuerySpec {
  @Equals('@subql/query')
  name: string;
  @IsString()
  @Validate(SemverVersionValidator)
  // @Matches(RUNNER_REGEX)
  version: string;
}
