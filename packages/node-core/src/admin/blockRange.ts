// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Type} from 'class-transformer';
import {IsInt, IsPositive, Min, IsOptional} from 'class-validator';

export interface BlockRangeDtoInterface {
  startBlock: number;
  endBlock?: number;
}

export class BlockRangeDto implements BlockRangeDtoInterface {
  constructor(startBlock: number, endBlock?: number) {
    this.startBlock = startBlock;
    this.endBlock = endBlock;
  }

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(0)
  startBlock: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(0)
  @IsOptional()
  endBlock: number | undefined;
}
