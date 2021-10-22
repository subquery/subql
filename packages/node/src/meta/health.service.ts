// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NodeConfig } from '../configure/NodeConfig';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  ProcessBlockPayload,
  TargetBlockPayload,
} from '../indexer/events';
import { StoreService } from '../indexer/store.service';

const DEFAULT_TIMEOUT = 900000;

@Injectable()
export class HealthService {
  private recordBlockHeight?: number;
  private recordBlockTimestamp?: number;
  private currentProcessingHeight?: number;
  private currentProcessingTimestamp?: number;
  private blockTime = 6000;
  private healthTimeout: number;

  constructor(
    protected nodeConfig: NodeConfig,
    private storeService: StoreService,
  ) {
    this.healthTimeout = Math.max(
      DEFAULT_TIMEOUT,
      this.nodeConfig.timeout * 1000,
    );
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload) {
    if (this.recordBlockHeight !== blockPayload.height) {
      this.recordBlockHeight = blockPayload.height;
      this.recordBlockTimestamp = Date.now();
      this.setHealth();
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    if (this.currentProcessingHeight !== blockPayload.height) {
      this.currentProcessingHeight = blockPayload.height;
      this.currentProcessingTimestamp = blockPayload.timestamp;
      this.setHealth();
    }
  }

  @OnEvent(IndexerEvent.NetworkMetadata)
  handleNetworkMetadata({ blockTime }: NetworkMetadataPayload): void {
    this.blockTime = blockTime;
    this.setHealth();
  }

  async setHealth() {
    try {
      this.getHealth();
      await this.storeService.setMetadata('indexerHealthy', true);
    } catch (e) {
      await this.storeService.setMetadata('indexerHealthy', false);
    }
  }

  getHealth() {
    if (
      this.recordBlockTimestamp &&
      Date.now() - this.recordBlockTimestamp > this.blockTime * 10
    ) {
      throw new Error('Endpoint is not healthy');
    }
    if (
      this.currentProcessingTimestamp &&
      Date.now() - this.currentProcessingTimestamp > this.healthTimeout
    ) {
      throw new Error('Indexer is not healthy');
    }
  }
}
