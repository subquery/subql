// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  NetworkMetadataPayload,
  ProcessBlockPayload,
  TargetBlockPayload,
} from '../indexer/events';
import { StoreService } from '../indexer/store.service';

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

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.currentProcessingHeight = blockPayload.height;
    this.currentProcessingTimestamp = blockPayload.timestamp;
  }

  @OnEvent(IndexerEvent.BlockLastProcessed)
  async handleLastProcessedBlock(
    blockPayload: ProcessBlockPayload,
  ): Promise<void> {
    console.log('here');
    this.lastProcessedHeight = blockPayload.height;
    this.lastProcessedTimestamp = blockPayload.timestamp;
    await Promise.all([
      this.storeService.setMetadata('lastProcessedHeight', blockPayload.height),
      this.storeService.setMetadata(
        'lastProcessedTimestamp',
        blockPayload.timestamp,
      ),
    ]);
  }

  @OnEvent(IndexerEvent.BlockTarget)
  async handleTargetBlock(blockPayload: TargetBlockPayload): Promise<void> {
    this.targetHeight = blockPayload.height;
    await this.storeService.setMetadata('targetHeight', blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockBest)
  handleBestBlock(blockPayload: BestBlockPayload): void {
    this.bestHeight = blockPayload.height;
  }

  @OnEvent(IndexerEvent.NetworkMetadata)
  async handleNetworkMetadata(
    networkMeta: NetworkMetadataPayload,
  ): Promise<void> {
    this.networkMeta = networkMeta;
    await Promise.all([
      this.storeService.setMetadata('chain', networkMeta.chain),
      this.storeService.setMetadata('specName', networkMeta.specName),
      this.storeService.setMetadata('genesisHash', networkMeta.genesisHash),
    ]);
  }

  @OnEvent(IndexerEvent.ApiConnected)
  handleApiConnected({ value }: EventPayload<number>) {
    this.apiConnected = !!value;
  }

  @OnEvent(IndexerEvent.InjectedApiConnected)
  handleInjectedApiConnected({ value }: EventPayload<number>) {
    this.injectedApiConnected = !!value;
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({ value }: EventPayload<number>) {
    this.usingDictionary = !!value;
  }
}
