// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { getLogger } from '../utils/logger';
import { ReadyService } from './ready.service';

const logger = getLogger('ready');

@Controller('ready')
export class ReadyController {
  constructor(private readyService: ReadyService) {}

  @Get()
  getReady() {
    if (!this.readyService.ready) {
      throw new HttpException(
        {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Database schema is not created or ready',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
