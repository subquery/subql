// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  Controller,
  Get,
  Post,
  HttpException,
  HttpStatus,
  Param,
  Injectable,
  Query,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {
  AdminEvent,
  IndexerEvent,
  MonitorService,
  PoiService,
  RewindPayload,
  TargetBlockPayload,
} from '@subql/node-core';
import {getLogger} from '../logger';
import {BlockRangeDto, BlockRangeDtoInterface} from './blockRange';

const logger = getLogger('admin-api');
const REWIND_RESPONSE_TIMEOUT = 120; //seconds

function handleServiceCall<T>(serviceCall: () => T): T {
  try {
    return serviceCall();
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

@Controller('admin')
export class AdminController {
  constructor(
    private monitorService: MonitorService,
    private poiService: PoiService,
    private eventEmitter: EventEmitter2
  ) {}

  @Get('index_history/range')
  getIndexBlocks(): (string | number)[] {
    return handleServiceCall(() => this.monitorService.getBlockIndexHistory());
  }

  @Get('index_history/forks')
  async getIndexForks(): Promise<string[] | undefined> {
    return handleServiceCall(() => this.monitorService.getForkedRecords());
  }

  @Get('index_history/block/:blockHeight')
  async getIndexBlockRecord(@Param('blockHeight', ParseIntPipe) blockHeight: string): Promise<string[] | undefined> {
    return handleServiceCall(() => this.monitorService.getBlockIndexRecords(Number(blockHeight)));
  }

  @Get('poi/range')
  async getPoiRange(): Promise<BlockRangeDtoInterface | undefined> {
    return handleServiceCall(() => this.poiService.plainPoiRepo.getStartAndEndBlock());
  }

  @Get('poi/')
  async getPoisByRange(@Query(ValidationPipe) blockRange: BlockRangeDto) {
    const {endBlock, startBlock} = blockRange;
    // TODO, class validator seems not work properly, need to complete in future
    if (endBlock && Number(startBlock) > Number(endBlock)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'startBlock must be greater than endBlock',
        },
        HttpStatus.BAD_REQUEST
      );
    }
    logger.info(`[POI] Getting poi history for blocks from ${startBlock} to ${endBlock}`);
    return handleServiceCall(async () => {
      const pois = await this.poiService.plainPoiRepo.getPoiBlocksByRange(
        Number(startBlock),
        endBlock !== undefined ? Number(endBlock) : undefined
      );
      return pois.filter((poi) => poi !== undefined).map((poi) => PoiService.PoiToHuman(poi));
    });
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
