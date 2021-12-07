// Copyright 2020-2021 OnFinality Limited authors & contributors
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
  TargetBlockPayload,
} from '../indexer/events';
import { StoreService } from '../indexer/store.service';

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
  private injectedApiConnected: boolean;
  private lastProcessedHeight: number;
  private lastProcessedTimestamp: number;

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
      apiConnected: this.apiConnected,
      injectedApiConnected: this.injectedApiConnected,
      usingDictionary: this.usingDictionary,
      ...this.networkMeta,
    };
  }

  @Interval(UPDATE_HEIGHT_INTERVAL)
  async checkHeight() {
    await Promise.all([
      this.storeService.setMetadata(
        'lastProcessedHeight',
        this.lastProcessedHeight,
      ),
      this.storeService.setMetadata(
        'lastProcessedTimestamp',
        this.lastProcessedTimestamp,
      ),
      this.storeService.setMetadata('targetHeight', this.targetHeight),
    ]);
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockLastProcessed)
  handleLastProcessedBlock(blockPayload: ProcessBlockPayload): void {
    this.lastProcessedHeight = blockPayload.height;
    this.lastProcessedTimestamp = blockPayload.timestamp;
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

  @OnEvent(IndexerEvent.InjectedApiConnected)
  handleInjectedApiConnected({ value }: EventPayload<number>): void {
    this.injectedApiConnected = !!value;
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({ value }: EventPayload<number>): void {
    this.usingDictionary = !!value;
  }
}
