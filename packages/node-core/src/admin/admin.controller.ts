// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Controller, Get, Post, HttpException, HttpStatus, Param, Injectable, Query} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {AdminEvent, IndexerEvent, MonitorService, RewindPayload, TargetBlockPayload} from '@subql/node-core';
import {getLogger} from '../logger';

const logger = getLogger('admin-api');
const REWIND_RESPONSE_TIMEOUT = 120; //seconds
@Controller('admin')
export class AdminController {
  constructor(private monitorService: MonitorService, private eventEmitter: EventEmitter2) {}

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

  @Post('rewind')
  async rewindTarget(@Query() rewindData: TargetBlockPayload): Promise<RewindPayload> {
    try {
      const result = await Promise.race([
        new Promise<RewindPayload>((resolve, reject) => {
          this.eventEmitter
            .emitAsync(AdminEvent.rewindTarget, {height: rewindData.height})
            .then(() => {
              this.eventEmitter.once(AdminEvent.RewindTargetResponse, resolve);
            })
            .catch(reject);
        }),
        new Promise<RewindPayload>(
          (_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Rewind operation respond timeout after ${REWIND_RESPONSE_TIMEOUT} seconds. Please check metadata to ensure rewind completed`
                  )
                ),
              REWIND_RESPONSE_TIMEOUT * 1000
            ) // 60秒超时
        ),
      ]);
      return result;
    } catch (error) {
      return {success: false, height: rewindData.height, message: `Rewind failed: ${error}`};
    }
  }
}

@Injectable()
export class AdminListener {
  constructor(private eventEmitter: EventEmitter2) {}

  @OnEvent(IndexerEvent.RewindSuccess)
  handleRewindSuccess(payload: RewindPayload) {
    this.eventEmitter.emit(AdminEvent.RewindTargetResponse, {
      ...payload,
      message: `Rewind to block ${payload.height} successful`,
    });
  }

  @OnEvent(IndexerEvent.RewindFailure)
  handleRewindFailure(payload: RewindPayload) {
    this.eventEmitter.emit(AdminEvent.RewindTargetResponse, {...payload});
  }
}
