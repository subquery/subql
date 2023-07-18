// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {OnEvent} from '@nestjs/event-emitter';
import {InjectMetric} from '@willsoto/nestjs-prometheus';
import {Gauge} from 'prom-client';
import {
  BestBlockPayload,
  EventPayload,
  IndexerEvent,
  ProcessBlockPayload,
  ProcessedBlockCountPayload,
  TargetBlockPayload,
} from '../events';

export class MetricEventListener {
  private skipDictionaryCount = 0;

  constructor(
    @InjectMetric('subql_indexer_api_connected')
    private apiConnectedMetric: Gauge<string>,
    @InjectMetric('subql_indexer_block_queue_size')
    private blockQueueSizeMetric: Gauge<string>,
    @InjectMetric('subql_indexer_blocknumber_queue_size')
    private blocknumberQueueSizeMetric: Gauge<string>,
    @InjectMetric('subql_indexer_processing_block_height')
    private processingBlockHeight: Gauge<string>,
    @InjectMetric('subql_indexer_target_block_height')
    private targetHeightMetric: Gauge<string>,
    @InjectMetric('subql_indexer_best_block_height')
    private bestHeightMetric: Gauge<string>,
    @InjectMetric('subql_indexer_using_dictionary')
    private usingDictionaryMetric: Gauge<string>,
    @InjectMetric('subql_indexer_skip_dictionary_count')
    private skipDictionaryCountMetric: Gauge<string>,
    @InjectMetric('subql_indexer_processed_block_count')
    private processedBlockCountMetric: Gauge<string>,
    @InjectMetric('subql_indexer_store_cache_threshold')
    private storeCacheThreshold: Gauge<string>,
    @InjectMetric('subql_indexer_store_cache_records_size')
    private storeCacheRecordsSize: Gauge<string>
  ) {}

  @OnEvent(IndexerEvent.ApiConnected)
  handleApiConnected({value}: EventPayload<number>): void {
    this.apiConnectedMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlockQueueSize)
  handleBlockQueueSizeMetric({value}: EventPayload<number>): void {
    this.blockQueueSizeMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlocknumberQueueSize)
  handleBlocknumberQueueSizeMetric({value}: EventPayload<number>): void {
    this.blocknumberQueueSizeMetric.set(value);
  }

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessBlockPayload): void {
    this.processingBlockHeight.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockProcessedCount)
  handleProcessedBlockCount(blockPayload: ProcessedBlockCountPayload): void {
    this.processedBlockCountMetric.set(blockPayload.processedBlockCount);
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload): void {
    this.targetHeightMetric.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockBest)
  handleBestBlock(blockPayload: BestBlockPayload): void {
    this.bestHeightMetric.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.UsingDictionary)
  handleUsingDictionary({value}: EventPayload<number>): void {
    this.usingDictionaryMetric.set(value);
  }

  @OnEvent(IndexerEvent.SkipDictionary)
  handleSkipDictionary(): void {
    this.skipDictionaryCount += 1;
    this.skipDictionaryCountMetric.set(this.skipDictionaryCount);
  }

  @OnEvent(IndexerEvent.StoreCacheThreshold)
  handleStoreCacheThreshold({value}: EventPayload<number>): void {
    this.storeCacheThreshold.set(value);
  }

  @OnEvent(IndexerEvent.StoreCacheRecordsSize)
  handleStoreCacheRecordsSize({value}: EventPayload<number>): void {
    this.storeCacheRecordsSize.set(value);
  }
}
