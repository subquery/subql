// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {OnEvent} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {NodeConfig} from '@subql/node-core/configure';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {IndexerEvent, ProcessBlockPayload, ProcessedBlockCountPayload, TargetBlockPayload} from '../events';
import {getLogger} from '../logger';
import {delay} from '../utils/promise';

// import {getYargsOption} from '../yargs';

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

  private currentProcessedBlockAmount: number;
  private lastProcessedBlockAmount: number;

  private nodeConfig: NodeConfig;

  @Interval(SAMPLING_TIME_VARIANCE * 1000)
  async benchmark(): Promise<void> {
    if (!this.currentProcessingHeight || !this.currentProcessingTimestamp || !this.currentProcessedBlockAmount) {
      await delay(10);
    } else {
      if (this.lastRegisteredHeight && this.lastRegisteredTimestamp) {
        const heightDiff = this.currentProcessingHeight - this.lastRegisteredHeight;
        const timeDiff = this.currentProcessingTimestamp - this.lastRegisteredTimestamp;
        this.blockPerSecond = heightDiff === 0 || timeDiff === 0 ? 0 : heightDiff / (timeDiff / 1000);

        const blockDuration = dayjs.duration(
          (this.targetHeight - this.currentProcessingHeight) / this.blockPerSecond,
          'seconds'
        );
        const hoursMinsStr = blockDuration.format('HH [hours] mm [mins]');
        const days = Math.floor(blockDuration.asDays());
        const durationStr = `${days} days ${hoursMinsStr}`;

        if (this.nodeConfig.profiler) {
          logger.info(
            `Processed ${
              this.currentProcessedBlockAmount - this.lastProcessedBlockAmount
            } blocks in the last ${SAMPLING_TIME_VARIANCE}secs `
          );
        }

        logger.info(
          this.targetHeight === this.lastRegisteredHeight && this.blockPerSecond === 0
            ? 'Fully synced, waiting for new blocks'
            : `${this.blockPerSecond.toFixed(2)} bps, target: #${this.targetHeight}, current: #${
                this.currentProcessingHeight
              }, estimate time: ${this.blockPerSecond === 0 ? 'unknown' : durationStr}`
        );
      }
      this.lastRegisteredHeight = this.currentProcessingHeight;
      this.lastRegisteredTimestamp = this.currentProcessingTimestamp;
      this.lastProcessedBlockAmount = this.currentProcessedBlockAmount;
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockProcessedCount)
  handleProcessedBlock(blockPayload: ProcessedBlockCountPayload): void {
    this.currentProcessedBlockAmount = blockPayload.processedBlockCount;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    this.targetHeight = blockPayload.height;
  }
}
