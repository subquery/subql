// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnEvent} from '@nestjs/event-emitter';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  NetworkMetadataPayload,
  ProcessBlockPayload,
  ProcessedBlockCountPayload,
  TargetBlockPayload,
} from '../events';

export type MetaServiceOptions = {
  /**
   * The version of the node from package.json
   * @example
   * "1.0.0
   * */
  version: string;
  sdkVersion: {
    /**
     * The name of the sdk
     * @example
     * "@polkadot/api"
     * */
    name: string;
    /**
     * The semver of the skd package from package.json
     * @example
     * "1.0.0"
     * */
    version: string;
  };
};

export class MetaService {
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

  constructor(private opts: MetaServiceOptions) {}

  getMeta() {
    const {name: sdkName, version} = this.opts.sdkVersion;

    return {
      currentProcessingHeight: this.currentProcessingHeight,
      currentProcessingTimestamp: this.currentProcessingTimestamp,
      targetHeight: this.targetHeight,
      bestHeight: this.bestHeight,
      indexerNodeVersion: this.opts.version,
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
