// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DynamicModule, Module} from '@nestjs/common';
import {PrometheusModule} from '@willsoto/nestjs-prometheus';
// import { FetchModule } from '../indexer/fetch.module';
import {CoreModule} from '../indexer';
import {MetricEventListener} from './event.listener';
import {HealthController} from './health.controller';
import {HealthService} from './health.service';
import {gaugeProviders} from './meta';
import {MetaController} from './meta.controller';
import {MetaService, MetaServiceOptions} from './meta.service';
import {ReadyController} from './ready.controller';
import {ReadyService} from './ready.service';

@Module({
  // imports: [PrometheusModule.register(), FetchModule],
  // controllers: [...metaControllers, MetaController],
  // providers: [...metaServices, MetaService],
})
export class MetaModule {
  static forRoot(options: MetaServiceOptions): DynamicModule {
    return {
      module: MetaModule,
      imports: [PrometheusModule.register(), CoreModule],
      controllers: [HealthController, ReadyController, MetaController],
      providers: [
        MetricEventListener,
        HealthService,
        ReadyService,
        ...gaugeProviders,
        {
          provide: MetaService,
          useFactory: () => new MetaService(options),
        },
      ],
    };
  }
}
