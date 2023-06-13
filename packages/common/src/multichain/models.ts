// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Type} from 'class-transformer';
import {Equals, IsObject, IsString} from 'class-validator';
import {QuerySpec, RunnerQueryBaseModel} from '../project';
import {MultichainProjectManifest} from './types';

export class MultichainProjectManifestModel implements MultichainProjectManifest {
  @Equals('1.0.0')
  specVersion: string;
  @IsString({each: true})
  projects: string[];
  @IsObject()
  @Type(() => RunnerQueryBaseModel)
  query: QuerySpec;
}
