// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { BlockPayload } from '../indexer/types';
import { MetricPayload, Metrics } from './types';

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

  private metricMap = {
    [Metrics.ApiConnected]: this.apiConnectedMetric,
    [Metrics.InjectedApiConnected]: this.injectedApiConnectedMetric,
    [Metrics.BlockQueueSize]: this.blockQueueSizeMetric,
    [Metrics.TargetHeight]: this.targetHeightMetric,
  };

  @OnEvent('metric.write')
  handleMetric({ name, value }: MetricPayload) {
    this.metricMap[name]?.set(value);
  }

  @OnEvent('block.processing')
  handleProcessingBlock(blockPayload: BlockPayload) {
    if (blockPayload.name === 'processing_block_event') {
      this.processingBlockHeight.set(blockPayload.data.height);
    }
  }
}
