// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {NodeConfig} from '../configure';
import {IndexerEvent, PoiEvent, ProcessBlockPayload, ProcessedBlockCountPayload, TargetBlockPayload} from '../events';
import {getLogger} from '../logger';
import {delay} from '../utils/promise';

const SAMPLING_TIME_VARIANCE = 15;
const logger = getLogger('benchmark');
dayjs.extend(duration);

@Injectable()
export class BenchmarkService {
  private currentProcessingHeight?: number;
  private currentProcessingTimestamp?: number;
  private targetHeight?: number;
  private lastRegisteredHeight?: number;
  private lastRegisteredTimestamp?: number;
  private blockPerSecond?: number;

  private currentProcessedBlockAmount?: number;
  private lastProcessedBlockAmount?: number;

  private lastPoiWithMmr?: number;
  private lastRegisteredPoiWithMmr?: number;
  private poiTarget?: number;
  private lastProcessedPoiAmount?: number;
  private currentProcessedPoiAmount?: number;
  private poiPerSecond?: number;
  private currentPoiTimestamp?: number;
  private lastRegisteredPoiTimestamp?: number;
  // If add more benchmarking, we can make this class as a baseClass

  constructor(private nodeConfig: NodeConfig) {}

  private async benchMarkPoi(): Promise<void> {
    if (this.nodeConfig.proofOfIndex) {
      if (!this.lastPoiWithMmr || !this.currentPoiTimestamp) {
        await delay(10);
      } else {
        if (this.lastRegisteredPoiWithMmr && this.lastRegisteredPoiTimestamp) {
          const heightDiff = this.lastPoiWithMmr - this.lastRegisteredPoiWithMmr;
          const timeDiff = this.currentPoiTimestamp - this.lastRegisteredPoiTimestamp;
          this.poiPerSecond = heightDiff === 0 || timeDiff === 0 ? 0 : heightDiff / (timeDiff / 1000);

          if (!this.poiTarget) {
            logger.debug('Target height is not defined, not logging benchmark');
          } else {
            const blockDuration = dayjs.duration(
              (this.poiTarget - this.lastRegisteredPoiWithMmr) / this.poiPerSecond,
              'seconds'
            );
            const hoursMinsStr = blockDuration.format('HH [hours] mm [mins]');
            const days = Math.floor(blockDuration.asDays());
            const durationStr = `${days} days ${hoursMinsStr}`;

            if (this.nodeConfig.profiler && this.currentProcessedPoiAmount && this.lastProcessedPoiAmount) {
              logger.info(
                `Processed ${
                  this.currentProcessedPoiAmount - this.lastProcessedPoiAmount
                } blocks in the last ${SAMPLING_TIME_VARIANCE}secs `
              );
            }

            logger.info(
              `POI: ${
                this.poiTarget === this.lastRegisteredPoiWithMmr && this.blockPerSecond === 0
                  ? 'Fully synced, waiting for new Poi records'
                  : `${this.poiPerSecond.toFixed(
                      2
                    )} blocks/s. Target Poi height: ${this.poiTarget.toLocaleString()}. Current height: ${this.lastPoiWithMmr.toLocaleString()}. Estimated time remaining: ${
                      this.blockPerSecond === 0 ? 'unknown' : durationStr
                    }`
              }`
            );
          }
        }
        this.lastRegisteredPoiWithMmr = this.lastPoiWithMmr;
        this.lastRegisteredPoiTimestamp = this.currentPoiTimestamp;
        this.lastProcessedPoiAmount = this.currentProcessedPoiAmount;
      }
    }
  }

  private async benchMarkingIndexing(): Promise<void> {
    if (!this.currentProcessingHeight || !this.currentProcessingTimestamp) {
      await delay(10);
    } else {
      if (this.lastRegisteredHeight && this.lastRegisteredTimestamp) {
        const heightDiff = this.currentProcessingHeight - this.lastRegisteredHeight;
        const timeDiff = this.currentProcessingTimestamp - this.lastRegisteredTimestamp;
        this.blockPerSecond = heightDiff === 0 || timeDiff === 0 ? 0 : heightDiff / (timeDiff / 1000);

        if (!this.targetHeight) {
          logger.debug('Target height is not defined, not logging benchmark');
        } else {
          const blockDuration = dayjs.duration(
            (this.targetHeight - this.currentProcessingHeight) / this.blockPerSecond,
            'seconds'
          );
          const hoursMinsStr = blockDuration.format('HH [hours] mm [mins]');
          const days = Math.floor(blockDuration.asDays());
          const durationStr = `${days} days ${hoursMinsStr}`;

          if (this.nodeConfig.profiler && this.currentProcessedBlockAmount && this.lastProcessedBlockAmount) {
            logger.info(
              `Processed ${
                this.currentProcessedBlockAmount - this.lastProcessedBlockAmount
              } blocks in the last ${SAMPLING_TIME_VARIANCE}secs `
            );
          }

          logger.info(
            `INDEXING: ${
              this.targetHeight === this.lastRegisteredHeight && this.blockPerSecond === 0
                ? 'Fully synced, waiting for new blocks'
                : `${this.blockPerSecond.toFixed(
                    2
                  )} blocks/s. Target height: ${this.targetHeight.toLocaleString()}. Current height: ${this.currentProcessingHeight.toLocaleString()}. Estimated time remaining: ${
                    this.blockPerSecond === 0 ? 'unknown' : durationStr
                  }`
            }`
          );
        }
      }
      this.lastRegisteredHeight = this.currentProcessingHeight;
      this.lastRegisteredTimestamp = this.currentProcessingTimestamp;
      this.lastProcessedBlockAmount = this.currentProcessedBlockAmount;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  @Interval(SAMPLING_TIME_VARIANCE * 1000)
  benchmark(): void {
    try {
      void this.benchMarkPoi();
      void this.benchMarkingIndexing();
    } catch (e: any) {
      logger.warn(e, 'Failed to measure benchmark');
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

  @OnEvent(PoiEvent.LastPoiWithMmr)
  handleLastPoiWithMmr(blockPayload: ProcessBlockPayload): void {
    this.lastPoiWithMmr = blockPayload.height;
    this.currentPoiTimestamp = blockPayload.timestamp;
  }

  @OnEvent(PoiEvent.PoiTarget)
  handlePoiTarget(blockPayload: ProcessBlockPayload): void {
    this.poiTarget = blockPayload.height;
    this.currentPoiTimestamp = blockPayload.timestamp;
  }
}
