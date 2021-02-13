// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  makeGaugeProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { MetricEventListener } from './event.listener';

@Module({
  imports: [PrometheusModule.register()],
  providers: [
    MetricEventListener,
    makeGaugeProvider({
      name: 'subql_indexer_api_connected',
      help: 'The indexer api connection status',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_injected_api_connected',
      help: 'The indexer injected api connection status',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_processing_block_height',
      help: 'The current processing block height',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_target_block_height',
      help: 'The latest finalized block height',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_block_queue_size',
      help: 'The size of fetched block queue',
    }),
  ],
})
export class PrometheusMetricModule {}
