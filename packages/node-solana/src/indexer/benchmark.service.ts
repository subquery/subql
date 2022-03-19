// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { getLogger } from '../utils/logger';
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

  @Interval(SAMPLING_TIME_VARIANCE * 1000)
  async benchmark(): Promise<void> {
    if (!this.currentProcessingHeight || !this.currentProcessingTimestamp) {
      await delay(10);
    } else {
      if (this.lastRegisteredHeight && this.lastRegisteredTimestamp) {
        const heightDiff =
          this.currentProcessingHeight - this.lastRegisteredHeight;
        const timeDiff =
          this.currentProcessingTimestamp - this.lastRegisteredTimestamp;
        this.blockPerSecond = heightDiff / (timeDiff / 1000);

        const duration = dayjs.duration(
          (this.targetHeight - this.currentProcessingHeight) /
            this.blockPerSecond,
          'seconds',
        );
        const hoursMinsStr = duration.format('HH [hours] mm [mins]');
        const days = Math.floor(duration.asDays());
        const durationStr = `${days} days ${hoursMinsStr}`;
        logger.info(
          `${this.blockPerSecond.toFixed(2)} bps, target: #${
            this.targetHeight
          }, current: #${
            this.currentProcessingHeight
          }, estimate time: ${durationStr}`,
        );
      }
      this.lastRegisteredHeight = this.currentProcessingHeight;
      this.lastRegisteredTimestamp = this.currentProcessingTimestamp;
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload) {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload) {
    this.targetHeight = blockPayload.height;
  }

  @OnEvent(IndexerEvent.Started)
  handleStartedIndexer(blockPayload: TargetBlockPayload) {
    if (!this.lastRegisteredHeight || !this.lastRegisteredTimestamp) {
      this.lastRegisteredHeight = blockPayload.height - 1;
      this.lastRegisteredTimestamp = Date.now();
    }
  }
}
