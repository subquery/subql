// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { getLogger } from '../utils/logger';
import { HealthService } from './health.service';

const logger = getLogger('health');

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  getHealth() {
    try {
      this.healthService.getHealth();
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
