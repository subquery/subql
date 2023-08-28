// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnEvent} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {NodeConfig} from '../configure';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  NetworkMetadataPayload,
  ProcessBlockPayload,
  ProcessedBlockCountPayload,
  TargetBlockPayload,
} from '../events';
import {StoreCacheService} from '../indexer';

let UPDATE_HEIGHT_INTERVAL: number;

export abstract class BaseMetaService {
  private currentProcessingHeight?: number;
  private currentProcessingTimestamp?: number;
  private bestHeight?: number;
  private targetHeight?: number;
  private networkMeta?: NetworkMetadataPayload;
  private apiConnected?: boolean;
  private usingDictionary?: boolean;
  private lastProcessedHeight?: number;
  private lastProcessedTimestamp?: number;
  private processedBlockCount?: number;

  constructor(private storeCacheService: StoreCacheService, private config: NodeConfig) {
    UPDATE_HEIGHT_INTERVAL = config.storeFlushInterval * 1000;
  }

  protected abstract packageVersion: string;

  protected abstract sdkVersion(): {
    name: string;
    version: string;
  };

  getMeta() {
    const {name: sdkName, version} = this.sdkVersion();

    return {
      currentProcessingHeight: this.currentProcessingHeight,
      currentProcessingTimestamp: this.currentProcessingTimestamp,
      targetHeight: this.targetHeight,
      bestHeight: this.bestHeight,
      indexerNodeVersion: this.packageVersion,
      lastProcessedHeight: this.lastProcessedHeight,
      lastProcessedTimestamp: this.lastProcessedTimestamp,
      uptime: process.uptime(),
      processedBlockCount: this.processedBlockCount,
      apiConnected: this.apiConnected,
      usingDictionary: this.usingDictionary,
      [sdkName]: version,
      ...this.networkMeta,
    };
  }

  @Interval(UPDATE_HEIGHT_INTERVAL)
  getTargetHeight(): void {
    if (this.targetHeight === undefined) return;
    this.storeCacheService.metadata.set('targetHeight', this.targetHeight);
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
  handleApiConnected({value}: EventPayload<number>): void {
    this.apiConnected = !!value;
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({value}: EventPayload<number>): void {
    this.usingDictionary = !!value;
  }
}
