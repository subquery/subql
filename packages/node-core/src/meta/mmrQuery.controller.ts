// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Controller, Get, Param, UseFilters} from '@nestjs/common';
import {MmrService} from '../indexer';
import {MmrExceptionsFilter} from '../utils/mmr-exception.filter';

const mmrExceptionsFilter = new MmrExceptionsFilter();

@Controller('mmrs')
export class MmrQueryController {
  private _mmrEnsured = false;
  constructor(private mmrService: MmrService) {}

  async ensureMmrService(): Promise<void> {
    if (!this._mmrEnsured) {
      await this.mmrService.ensureMmr();
      this._mmrEnsured = true;
    }
    return;
  }

  @Get('latest')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmr(@Param() params: any) {
    // eslint-disable-next-line no-return-await
    await this.ensureMmrService();
    return this.mmrService.getMmr(await this.mmrService.getLatestMmrHeight(false), false);
  }

  @Get('latest/proof')
  @UseFilters(mmrExceptionsFilter)
  async getLatestMmrProof(@Param() params: any) {
    await this.ensureMmrService();
    return this.mmrService.getMmrProof(await this.mmrService.getLatestMmrHeight(false), false);
  }

  @Get(':blockHeight')
  @UseFilters(mmrExceptionsFilter)
  async getMmr(@Param() params: {blockHeight: number}) {
    // eslint-disable-next-line no-return-await
    await this.ensureMmrService();
    return this.mmrService.getMmr(params.blockHeight, false);
  }

  @Get(':blockHeight/proof')
  @UseFilters(mmrExceptionsFilter)
  async getMmrProof(@Param() params: {blockHeight: number}) {
    await this.ensureMmrService();
    return this.mmrService.getMmrProof(params.blockHeight, false);
  }
}
