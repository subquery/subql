// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get, HttpException, HttpStatus} from '@nestjs/common';
import {getLogger} from '../logger';
import {HealthService} from './health.service';

const logger = getLogger('health');

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  getHealth(): void {
    try {
      this.healthService.getHealth();
    } catch (e: any) {
      logger.error(e);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: e.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
