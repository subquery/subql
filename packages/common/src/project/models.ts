// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IsString, IsOptional, IsInt} from 'class-validator';
import {BlockFilter} from './types';

export class BlockFilterImpl implements BlockFilter {
  @IsOptional()
  @IsInt()
  modulo?: number;
  @IsOptional()
  @IsString()
  timestamp?: string;
}
