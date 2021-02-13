// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
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
    private processingHeight: Gauge<string>,
    @InjectMetric('subql_indexer_target_block_height')
    private targetHeightMetric: Gauge<string>,
  ) {}

  private metricMap = {
    [Metrics.ApiConnected]: this.apiConnectedMetric,
    [Metrics.InjectedApiConnected]: this.injectedApiConnectedMetric,
    [Metrics.BlockQueueSize]: this.blockQueueSizeMetric,
    [Metrics.ProcessingHeight]: this.processingHeight,
    [Metrics.TargetHeight]: this.targetHeightMetric,
  };

  @OnEvent('metric.write')
  handleEvents({ name, value }: MetricPayload) {
    this.metricMap[name]?.set(value);
  }
}
