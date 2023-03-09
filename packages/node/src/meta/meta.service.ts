// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  NetworkMetadataPayload,
  ProcessBlockPayload,
  ProcessedBlockCountPayload,
  TargetBlockPayload,
  StoreService,
  getLogger,
  NodeConfig,
} from '@subql/node-core';

const UPDATE_HEIGHT_INTERVAL = 60000;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: polkadotSdkVersion } = require('@polkadot/api/package.json');
const { version: packageVersion } = require('../../package.json');
const logger = getLogger('profiler');

@Injectable()
export class MetaService {
  private currentProcessingHeight: number;
  private currentProcessingTimestamp: number;
  private bestHeight: number;
  private targetHeight: number;
  private networkMeta: NetworkMetadataPayload;
  private apiConnected: boolean;
  private usingDictionary: boolean;
  private injectedApiConnected: boolean;
  private lastProcessedHeight: number;
  private lastProcessedTimestamp: number;
  private processedBlockCount: number;
  private accEnqueueBlocks = 0;
  private accFetchBlocks = 0;
  private currentFilteringBlockNum = 0;
  private accRpcCalls = 0;
  private lastReportedFilteringBlockNum = 0;
  private lastReportedEnqueueBlocks = 0;
  private lastReportedFetchBlocks = 0;
  private lastReportedRpcCalls = 0;
  private lastStatsReportedTs: Date;

  constructor(
    private storeService: StoreService,
    private nodeConfig: NodeConfig,
  ) {}

  getMeta() {
    return {
      currentProcessingHeight: this.currentProcessingHeight,
      currentProcessingTimestamp: this.currentProcessingTimestamp,
      targetHeight: this.targetHeight,
      bestHeight: this.bestHeight,
      indexerNodeVersion: packageVersion,
      lastProcessedHeight: this.lastProcessedHeight,
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      uptime: process.uptime(),
      polkadotSdkVersion,
      processedBlockCount: this.processedBlockCount,
      apiConnected: this.apiConnected,
      injectedApiConnected: this.injectedApiConnected,
      usingDictionary: this.usingDictionary,
      ...this.networkMeta,
    };
  }

  @Interval(UPDATE_HEIGHT_INTERVAL)
  async getTargetHeight(): Promise<void> {
    await this.storeService.setMetadata('targetHeight', this.targetHeight);
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockProcessedCount)
  handleProcessedBlock(blockPayload: ProcessedBlockCountPayload): void {
    this.processedBlockCount = blockPayload.processedBlockCount;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    this.targetHeight = blockPayload.height;
  }

  @OnEvent(IndexerEvent.BlockBest)
  handleBestBlock(blockPayload: BestBlockPayload): void {
    this.bestHeight = blockPayload.height;
  }

  @OnEvent(IndexerEvent.NetworkMetadata)
  handleNetworkMetadata(networkMeta: NetworkMetadataPayload): void {
    this.networkMeta = networkMeta;
  }

  @OnEvent(IndexerEvent.ApiConnected)
  handleApiConnected({ value }: EventPayload<number>): void {
    this.apiConnected = !!value;
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({ value }: EventPayload<number>): void {
    this.usingDictionary = !!value;
  }

  @OnEvent('enqueueBlocks')
  handleEnqueueBlocks(size: number): void {
    this.accEnqueueBlocks += size;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @OnEvent('filteringBlocks')
  handleFilteringBlocks(height: number): void {
    this.currentFilteringBlockNum = height;
    if (!this.lastStatsReportedTs) {
      this.lastReportedFilteringBlockNum = height;
    }
  }

  @OnEvent('fetchBlock')
  handleFetchBlock(): void {
    this.accFetchBlocks++;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @OnEvent('rpcCall')
  handleRpcCall(): void {
    this.accRpcCalls++;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @Interval(10000)
  blockFilteringSpeed(): void {
    if (!this.nodeConfig.profiler) {
      return;
    }
    const count = this.accEnqueueBlocks - this.lastReportedEnqueueBlocks;
    this.lastReportedEnqueueBlocks = this.accEnqueueBlocks;
    const filteringCount =
      this.currentFilteringBlockNum - this.lastReportedFilteringBlockNum;
    const now = new Date();
    const timepass = now.getTime() - this.lastStatsReportedTs.getTime();
    this.lastStatsReportedTs = now;
    this.lastReportedFilteringBlockNum = this.currentFilteringBlockNum;
    const rpcCalls = this.accRpcCalls - this.lastReportedRpcCalls;
    this.lastReportedRpcCalls = this.accRpcCalls;
    const fetchCount = this.accFetchBlocks - this.lastReportedFetchBlocks;
    this.lastReportedFetchBlocks = this.accFetchBlocks;
    logger.info(`actual block filtering: ${(count / (timepass / 1000)).toFixed(
      2,
    )}/sec, \
seeming speed: ${(filteringCount / (timepass / 1000)).toFixed(
      2,
    )}/sec, rpcCalls: ${(rpcCalls / (timepass / 1000)).toFixed(2)}/sec \
fetch speed: ${(fetchCount / (timepass / 1000)).toFixed(2)}/sec`);
  }
}
