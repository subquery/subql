// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { Sequelize } from 'sequelize';
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
  private indexerHealthy: boolean;
  private changed: boolean;

  constructor(
    protected nodeConfig: NodeConfig,
    private storeService: StoreService,
  ) {
    this.healthTimeout = Math.max(
      DEFAULT_TIMEOUT,
      this.nodeConfig.timeout * 1000,
    );

    this.changed = false;
  }

  @Interval(60000)
  async checkHealthStatus() {
    if (this.changed) {
      this.evaluateHealth();
      const instance = await this.storeService.findMetadataValue(
        'indexerHealthy',
        this.indexerHealthy,
      );

      if (instance === null) {
        await this.storeService.setMetadata(
          'indexerHealthy',
          this.indexerHealthy,
        );
      }

      this.changed = false;
    }
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    if (this.recordBlockHeight !== blockPayload.height) {
      this.recordBlockHeight = blockPayload.height;
      this.recordBlockTimestamp = Date.now();
      this.changed = true;
    }
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    if (this.currentProcessingHeight !== blockPayload.height) {
      this.currentProcessingHeight = blockPayload.height;
      this.currentProcessingTimestamp = blockPayload.timestamp;
      this.changed = true;
    }
  }

  @OnEvent(IndexerEvent.NetworkMetadata)
  handleNetworkMetadata({ blockTime }: NetworkMetadataPayload): void {
    this.blockTime = blockTime;
    this.changed = true;
  }

  evaluateHealth() {
    try {
      this.getHealth();
      this.indexerHealthy = true;
    } catch (e) {
      this.indexerHealthy = false;
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
