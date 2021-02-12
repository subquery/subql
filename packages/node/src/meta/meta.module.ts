// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  makeGaugeProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { MetricEventListener } from './event.listener';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [PrometheusModule.register()],
  controllers: [MetaController],
  providers: [
    MetricEventListener,
    makeGaugeProvider({
      name: 'api_connected_status',
      help: 'The indexer api connection status',
    }),
    makeGaugeProvider({
      name: 'injected_api_connected_status',
      help: 'The indexer injected api connection status',
    }),
    makeGaugeProvider({
      name: 'block_processing_height',
      help: 'The current processing block height',
    }),
    makeGaugeProvider({
      name: 'block_target_height',
      help: 'The latest finalized block height',
    }),
    makeGaugeProvider({
      name: 'block_queue_size',
      help: 'The size of fetched block queue',
    }),
    MetaService,
  ],
})
export class MetaModule {}
