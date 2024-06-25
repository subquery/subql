// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {MultichainProjectManifest, QuerySpec} from '@subql/types-core';
import {Type} from 'class-transformer';
import {Equals, IsObject, IsString} from 'class-validator';
import {RunnerQueryBaseModel} from '../project';

export class MultichainProjectManifestModel implements MultichainProjectManifest {
  @Equals('1.0.0')
  specVersion!: string;
  @IsString({each: true})
  projects!: string[];
  @IsObject()
  @Type(() => RunnerQueryBaseModel)
  query!: QuerySpec;
}
