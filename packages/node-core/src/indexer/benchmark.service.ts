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
class BaseBenchmarkService {
  protected currentProcessingHeight?: number;
  protected currentProcessingTimestamp?: number;
  protected targetHeight?: number;
  protected lastRegisteredHeight?: number;
  protected lastRegisteredTimestamp?: number;
  protected blockPerSecond?: number;

  protected currentProcessedBlockAmount?: number;
  protected lastProcessedBlockAmount?: number;

  constructor(private nodeConfig: NodeConfig, private eventName: string, private unitName: string) {}
  private async benchMarking(): Promise<void> {
    if (!this.currentProcessingHeight || !this.currentProcessingTimestamp) {
      await delay(10);
    } else {
      if (this.lastRegisteredHeight && this.lastRegisteredTimestamp) {
        const heightDiff = this.currentProcessingHeight - this.lastRegisteredHeight;
        const timeDiff = this.currentProcessingTimestamp - this.lastRegisteredTimestamp;
        this.blockPerSecond = heightDiff === 0 || timeDiff === 0 ? 0 : heightDiff / (timeDiff / 1000);

        if (!this.targetHeight) {
          logger.debug(`${this.eventName}: Target height is not defined, not logging benchmark`);
        } else {
          const blockDuration = dayjs.duration(
            (this.targetHeight - this.currentProcessingHeight) / this.blockPerSecond,
            'seconds'
          );
          const hoursMinsStr = blockDuration.format('HH [hours] mm [mins]');
          const days = Math.floor(blockDuration.asDays());
          const durationStr = `${days} days ${hoursMinsStr}`;

          // Poi will ignore this by default, as poi doesn't record processedCount
          if (this.nodeConfig.profiler && this.currentProcessedBlockAmount && this.lastProcessedBlockAmount) {
            logger.info(
              `${this.eventName}: Processed ${this.currentProcessedBlockAmount - this.lastProcessedBlockAmount} ${
                this.unitName
              } in the last ${SAMPLING_TIME_VARIANCE}secs `
            );
          }

          logger.info(
            `${this.eventName}: ${
              this.targetHeight === this.lastRegisteredHeight && this.blockPerSecond === 0
                ? `Fully synced, waiting for new ${this.unitName}`
                : `${this.blockPerSecond.toFixed(2)} ${
                    this.unitName
                  }/s. Target height: ${this.targetHeight.toLocaleString()}. Current height: ${this.currentProcessingHeight.toLocaleString()}. Estimated time remaining: ${
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

  @Interval(SAMPLING_TIME_VARIANCE * 1000)
  async benchmark(): Promise<void> {
    try {
      await this.benchMarking();
    } catch (e: any) {
      logger.warn(e, 'Failed to measure benchmark');
    }
  }
}

@Injectable()
export class PoiBenchmarkService extends BaseBenchmarkService {
  constructor(nodeConfig: NodeConfig) {
    super(nodeConfig, 'POI', 'poi blocks');
  }

  @OnEvent(PoiEvent.LastPoiWithMmr)
  handleLastPoiWithMmr(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(PoiEvent.PoiTarget)
  handlePoiTarget(blockPayload: ProcessBlockPayload): void {
    this.targetHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }
}

@Injectable()
export class IndexingBenchmarkService extends BaseBenchmarkService {
  constructor(nodeConfig: NodeConfig) {
    super(nodeConfig, 'INDEXING', 'blocks');
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
