// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  ProcessBlockPayload,
  TargetBlockPayload,
} from '../indexer/events';

export class MetricEventListener {
  private skipDictionaryCount = 0;

  constructor(
    @InjectMetric('subql_indexer_api_connected')
    private apiConnectedMetric: Gauge<string>,
    @InjectMetric('subql_indexer_injected_api_connected')
    private injectedApiConnectedMetric: Gauge<string>,
    @InjectMetric('subql_indexer_block_queue_size')
    private blockQueueSizeMetric: Gauge<string>,
    @InjectMetric('subql_indexer_blocknumber_queue_size')
    private blocknumberQueueSizeMetric: Gauge<string>,
    @InjectMetric('subql_indexer_processing_block_height')
    private processingBlockHeight: Gauge<string>,
    @InjectMetric('subql_indexer_processed_block_height')
    private processedBlockHeight: Gauge<string>,
    @InjectMetric('subql_indexer_target_block_height')
    private targetHeightMetric: Gauge<string>,
    @InjectMetric('subql_indexer_best_block_height')
    private bestHeightMetric: Gauge<string>,
    @InjectMetric('subql_indexer_using_dictionary')
    private usingDictionaryMetric: Gauge<string>,
    @InjectMetric('subql_indexer_skip_dictionary_count')
    private skipDictionaryCountMetric: Gauge<string>,
  ) {}

  @OnEvent(IndexerEvent.ApiConnected)
  handleApiConnected({ value }: EventPayload<number>) {
    this.apiConnectedMetric.set(value);
  }

  @OnEvent(IndexerEvent.InjectedApiConnected)
  handleInjectedApiConnected({ value }: EventPayload<number>) {
    this.injectedApiConnectedMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlockQueueSize)
  handleBlockQueueSizeMetric({ value }: EventPayload<number>) {
    this.blockQueueSizeMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlocknumberQueueSize)
  handleBlocknumberQueueSizeMetric({ value }: EventPayload<number>) {
    this.blocknumberQueueSizeMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload) {
    this.processingBlockHeight.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload) {
    this.targetHeightMetric.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockBest)
  handleBestBlock(blockPayload: BestBlockPayload) {
    this.bestHeightMetric.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({ value }: EventPayload<number>) {
    this.usingDictionaryMetric.set(value);
  }

  @OnEvent(IndexerEvent.SkipDictionary)
  handleSkipDictionary() {
    this.skipDictionaryCount += 1;
    this.skipDictionaryCountMetric.set(this.skipDictionaryCount);
  }
}
