// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubqueryProject } from '../configure/project.model';
import { DbModule } from '../db/db.module';
import { ApiService } from './api.service';
import { BenchmarkService } from './benchmark.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { SandboxService } from './sandbox.service';
import { StoreService } from './store.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    IndexerManager,
    StoreService,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new ApiService(project, eventEmitter);
        await apiService.init();
        return apiService;
      },
      inject: [SubqueryProject, EventEmitter2],
    },
    FetchService,
    BenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    PoiService,
    MmrService,
  ],
  exports: [StoreService],
})
export class IndexerModule {}
