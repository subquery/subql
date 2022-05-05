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
import { MmrService } from '../indexer/mmr.service';
import { getLogger } from '../utils/logger';

const logger = getLogger('mmrs');

@Controller('mmrs')
export class MmrQueryController {
  constructor(private mmrService: MmrService) {}

  @Get(':blockHeight')
  async getMmr(@Param() params) {
    try {
      // add await, otherwise error been skipped
      return await this.mmrService.getMmr(params.blockHeight);
    } catch (e) {
      this.httpError(e);
    }
  }

  @Get()
  async getLatestMmr(@Query() query) {
    if (query.latest) {
      try {
        return await this.mmrService.getLatestMmr();
      } catch (e) {
        this.httpError(e);
      }
    } else {
      this.httpError(new Error(`query not supported`));
    }
  }

  httpError(e: Error) {
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
