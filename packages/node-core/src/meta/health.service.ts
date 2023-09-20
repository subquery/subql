// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {NodeConfig} from '../configure';
import {IndexerEvent, ProcessBlockPayload, TargetBlockPayload} from '../events';
import {StoreService} from '../indexer';

const DEFAULT_TIMEOUT = 900000;
const DEFAULT_BLOCK_TIME = 6000;
const CHECK_HEALTH_INTERVAL = 60000;

@Injectable()
export class HealthService {
  private recordBlockHeight?: number;
  private recordBlockTimestamp?: number;
  private currentProcessingHeight?: number;
  private currentProcessingTimestamp?: number;
  private blockTime: number;
  private healthTimeout: number;
  private indexerHealthy?: boolean;

  constructor(protected nodeConfig: NodeConfig, private storeService: StoreService) {
    this.healthTimeout = Math.max(DEFAULT_TIMEOUT, this.nodeConfig.timeout * 1000);
    this.blockTime = Math.max(DEFAULT_BLOCK_TIME, this.nodeConfig.blockTime);
  }

  @Interval(CHECK_HEALTH_INTERVAL)
  async checkHealthStatus(): Promise<void> {
    let healthy: boolean;

    try {
      this.getHealth();
      healthy = true;
    } catch (e) {
      healthy = false;
    }

    if (healthy !== this.indexerHealthy) {
      await this.storeService.storeCache.metadata.model.upsert({key: 'indexerHealthy', value: healthy});
      this.indexerHealthy = healthy;
    }
  }

  // Not all networks have a consistent interval for Finalized Blocks
  // Hence, the endpoint's health will be dictated by the best block (as it is a consistent interval)
  @OnEvent(IndexerEvent.BlockBest)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    if (this.recordBlockHeight !== blockPayload.height) {
      this.recordBlockHeight = blockPayload.height;
      this.recordBlockTimestamp = Date.now();
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    if (this.currentProcessingHeight !== blockPayload.height) {
      this.currentProcessingHeight = blockPayload.height;
      this.currentProcessingTimestamp = blockPayload.timestamp;
    }
  }

  getHealth(): void {
    if (this.recordBlockTimestamp && Date.now() - this.recordBlockTimestamp > this.blockTime * 10) {
      throw new Error('Endpoint is not healthy');
    }
    if (this.currentProcessingTimestamp && Date.now() - this.currentProcessingTimestamp > this.healthTimeout) {
      throw new Error('Indexer is not healthy');
    }
  }
}
