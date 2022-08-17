// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Controller, Get, Param, UseFilters} from '@nestjs/common';
import {MmrService} from '../indexer';
import {MmrExceptionsFilter} from '../utils/mmr-exception.filter';

const mmrExceptionsFilter = new MmrExceptionsFilter();

@Controller('mmrs')
export class MmrQueryController {
  constructor(private mmrService: MmrService) {}

  @Get('latest')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmr(@Param() params: any) {
    // eslint-disable-next-line no-return-await
    return this.mmrService.getLatestMmr();
  }

  @Get('latest/proof')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmrProof(@Param() params: any) {
    return this.mmrService.getLatestMmrProof();
  }

  @Get(':blockHeight')
  @UseFilters(mmrExceptionsFilter)
  async getMmr(@Param() params: {blockHeight: number}) {
    // eslint-disable-next-line no-return-await
    return this.mmrService.getMmr(params.blockHeight);
  }

  @Get(':blockHeight/proof')
  @UseFilters(mmrExceptionsFilter)
  async getMmrProof(@Param() params: {blockHeight: number}) {
    return this.mmrService.getMmrProof(params.blockHeight);
  }
}
