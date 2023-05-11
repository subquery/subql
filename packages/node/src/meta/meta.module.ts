// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  MetricEventListener,
  ReadyController,
  ReadyService,
  HealthController,
  HealthService,
  gaugeProviders,
} from '@subql/node-core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { FetchModule } from '../indexer/fetch.module';
import { MetaController } from './meta.controller';
import { MetaService } from './meta.service';

@Module({
  imports: [PrometheusModule.register(), FetchModule],
  controllers: [MetaController, HealthController, ReadyController],
  providers: [
    MetricEventListener,
    ...gaugeProviders,
    MetaService,
    HealthService,
    ReadyService,
  ],
})
export class MetaModule {}
