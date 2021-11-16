// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  makeGaugeProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { IndexerModule } from '../indexer/indexer.module';
import { MetricEventListener } from './event.listener';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [PrometheusModule.register(), IndexerModule],
  controllers: [MetaController, HealthController],
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
      name: 'subql_indexer_processed_block_height',
      help: 'The last processed block height',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_target_block_height',
      help: 'The latest finalized block height',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_best_block_height',
      help: 'The latest best block height',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_block_queue_size',
      help: 'The size of fetched block queue',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_blocknumber_queue_size',
      help: 'The size of fetched block number queue',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_using_dictionary',
      help: 'The status of indexer is using the dictionary',
    }),
    makeGaugeProvider({
      name: 'subql_indexer_skip_dictionary_count',
      help: 'The number of times indexer been skip use dictionary',
    }),
    MetaService,
    HealthService,
  ],
})
export class MetaModule {}
