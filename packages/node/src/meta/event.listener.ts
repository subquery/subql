// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import {
  EventPayload,
  IndexerEvent,
  ProcessingBlockPayload,
  TargetBlockPayload,
} from '../indexer/events';

export class MetricEventListener {
  constructor(
    @InjectMetric('subql_indexer_api_connected')
    private apiConnectedMetric: Gauge<string>,
    @InjectMetric('subql_indexer_injected_api_connected')
    private injectedApiConnectedMetric: Gauge<string>,
    @InjectMetric('subql_indexer_block_queue_size')
    private blockQueueSizeMetric: Gauge<string>,
    @InjectMetric('subql_indexer_processing_block_height')
    private processingBlockHeight: Gauge<string>,
    @InjectMetric('subql_indexer_target_block_height')
    private targetHeightMetric: Gauge<string>,
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

  @OnEvent(IndexerEvent.BlockProcessing)
  handleProcessingBlock(blockPayload: ProcessingBlockPayload) {
    this.processingBlockHeight.set(blockPayload.height);
  }

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload) {
    this.targetHeightMetric.set(blockPayload.height);
  }
}
