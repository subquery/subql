// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { bpsHelper, getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import {
  IndexerEvent,
  ProcessBlockPayload,
  TargetBlockPayload,
} from './events';

const SAMPLING_TIME_VARIANCE = 15;
const logger = getLogger('benchmark');
dayjs.extend(duration);

export class BenchmarkService {
  private currentProcessingHeight: number;
  private currentProcessingTimestamp: number;
  private targetHeight: number;
  private lastRegisteredHeight: number;
  private lastRegisteredTimestamp: number;
  private blockPerSecond: number;

  private processedBlockPerSecond: number;

  private lastProcessedBlockCount: number;
  private currentProcessedBlockCount: number;

  @Interval(SAMPLING_TIME_VARIANCE * 1000)
  async benchmark(): Promise<void> {
    if (
      !this.currentProcessingHeight ||
      !this.currentProcessingTimestamp ||
      !this.currentProcessedBlockCount
    ) {
      await delay(10);
    } else {
      // console.log('current',this.currentProcessedBlockCount)
      // console.log('last',this.lastProcessedBlockCount)
      // console.log('current height ',this.currentProcessingHeight)
      // console.log('last height ', this.lastRegisteredHeight)
      if (this.lastRegisteredHeight && this.lastRegisteredTimestamp) {
        const heightDiff =
          this.currentProcessingHeight - this.lastRegisteredHeight;
        const timeDiff =
          this.currentProcessingTimestamp - this.lastRegisteredTimestamp;

        const countDiff =
          this.currentProcessedBlockCount - this.lastProcessedBlockCount;
        this.blockPerSecond =
          heightDiff === 0 || timeDiff === 0
            ? 0
            : heightDiff / (timeDiff / 1000);

        this.processedBlockPerSecond =
          countDiff === 0 || timeDiff === 0 ? 0 : countDiff / (timeDiff / 1000);

        const blockDuration = dayjs.duration(
          (this.targetHeight - this.currentProcessingHeight) /
            this.blockPerSecond,
          'seconds',
        );

        const hoursMinsStr = blockDuration.format('HH [hours] mm [mins]');
        const days = Math.floor(blockDuration.asDays());
        const durationStr = `${days} days ${hoursMinsStr}`;

        logger.info(
          `Processed Blocks Per (${SAMPLING_TIME_VARIANCE}secs): ${this.processedBlockPerSecond.toFixed(
            2,
          )} secs`,
        );
        logger.info(
          this.targetHeight === this.lastRegisteredHeight &&
            this.blockPerSecond === 0
            ? 'Fully synced, waiting for new blocks'
            : `${this.blockPerSecond.toFixed(2)} bps, target: #${
                this.targetHeight
              }, current: #${this.currentProcessingHeight}, estimate time: ${
                this.blockPerSecond === 0 ? 'unknown' : durationStr
              }`,
        );
      }
      this.lastRegisteredHeight = this.currentProcessingHeight;
      this.lastRegisteredTimestamp = this.currentProcessingTimestamp;

      this.lastProcessedBlockCount = this.currentProcessedBlockCount;
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
    this.currentProcessedBlockCount = blockPayload.processedBlockCount;
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    this.targetHeight = blockPayload.height;
  }
}
