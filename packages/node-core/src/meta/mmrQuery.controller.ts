// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get, Param, UseFilters} from '@nestjs/common';
import {MmrExceptionsFilter} from '../utils/mmr-exception.filter';
import {MmrQueryService} from './mmrQuery.service';

const mmrExceptionsFilter = new MmrExceptionsFilter();

@Controller('mmrs')
export class MmrQueryController {
  constructor(private mmrQueryService: MmrQueryService) {}

  @Get('latest')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmr(@Param() params: any) {
    // eslint-disable-next-line no-return-await
    return this.mmrQueryService.getMmr(await this.mmrQueryService.getLatestMmrHeight());
  }

  @Get('latest/proof')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmrProof(@Param() params: any) {
    return this.mmrQueryService.getMmrProof(await this.mmrQueryService.getLatestMmrHeight());
  }

  @Get(':blockHeight')
  @UseFilters(mmrExceptionsFilter)
  async getMmr(@Param() params: {blockHeight: number}) {
    // eslint-disable-next-line no-return-await
    return this.mmrQueryService.getMmr(params.blockHeight);
  }

  @Get(':blockHeight/proof')
  @UseFilters(mmrExceptionsFilter)
  async getMmrProof(@Param() params: {blockHeight: number}) {
    return this.mmrQueryService.getMmrProof(params.blockHeight);
  }
}
