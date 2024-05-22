// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get, HttpException, HttpStatus, Param} from '@nestjs/common';
import {MonitorService} from '@subql/node-core';
import {getLogger} from '../logger';

const logger = getLogger('admin-api');

@Controller('admin')
export class AdminController {
  constructor(private monitorService: MonitorService) {}

  @Get('index_history/overview')
  getIndexBlocks(): (string | number)[] {
    try {
      return this.monitorService.getBlockIndexHistory();
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

  @Get('index_history/forks')
  async getIndexForks(): Promise<string[] | undefined> {
    try {
      return this.monitorService.getForkedRecords();
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

  @Get('index_history/block/:blockHeight')
  async getIndexBlockRecord(@Param('blockHeight') blockHeight: string): Promise<string[] | undefined> {
    try {
      return this.monitorService.getBlockIndexRecords(Number(blockHeight));
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
