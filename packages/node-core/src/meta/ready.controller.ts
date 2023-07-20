// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get, HttpException, HttpStatus} from '@nestjs/common';
import {ReadyService} from './ready.service';

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
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }
}
