// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { getLogger } from '../utils/logger';
import { MmrQueryService } from './mmrQuery.service';

const logger = getLogger('mmrs');

@Controller('mmrs')
export class MmrQueryController {
  constructor(private mmrService: MmrQueryService) {}

  @Get(':blockHeight')
  async getMmr(@Param() params) {
    try {
      return this.mmrService.getMmr(params.blockHeight);
    } catch (e) {
      logger.error(e.message);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: e.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async getLatestMmr(@Query() query) {
    if (query.latest) {
      try {
        return this.mmrService.getLatestMmr();
      } catch (e) {
        logger.error(e.message);
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: e.message,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
