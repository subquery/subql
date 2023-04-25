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
} from '@subql/node-core';

const UPDATE_HEIGHT_INTERVAL = 60000;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: polkadotSdkVersion } = require('@polkadot/api/package.json');
const { version: packageVersion } = require('../../package.json');

@Injectable()
export class MetaService {
  private currentProcessingHeight: number;
  private currentProcessingTimestamp: number;
  private bestHeight: number;
  private targetHeight: number;
  private networkMeta: NetworkMetadataPayload;
  private apiConnected: boolean;
  private usingDictionary: boolean;
  private lastProcessedHeight: number;
  private lastProcessedTimestamp: number;
  private processedBlockCount: number;

  constructor(private storeService: StoreService) {}

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
      usingDictionary: this.usingDictionary,
      ...this.networkMeta,
    };
  }

  @Interval(UPDATE_HEIGHT_INTERVAL)
  getTargetHeight(): void {
    this.storeService.storeCache.metadata.set(
      'targetHeight',
      this.targetHeight,
    );
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
}
