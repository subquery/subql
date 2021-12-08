// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { DbModule } from '../db/db.module';
import { ApiTerraService } from './apiterra.service';
import { BenchmarkService } from './benchmark.service';
import { FetchTerraService } from './fetchterra.service';
import { IndexerTerraManager } from './indexerterra.manager';
import { SandboxTerraService } from './sandboxterra.service';
import { StoreService } from './store.service';
import { TerraDsProcessorService } from './terrads-processor.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    IndexerTerraManager,
    StoreService,
    {
      //provide: ApiService,
      provide: ApiTerraService,
      useFactory: async (
        project: SubqueryTerraProject,
        eventEmitter: EventEmitter2,
      ) => {
        //const apiService = new ApiService(project, eventEmitter);
        const apiService = new ApiTerraService(project, eventEmitter);
        await apiService.init();
        return apiService;
      },
      inject: [SubqueryTerraProject, EventEmitter2],
    },
    FetchTerraService,
    BenchmarkService,
    SandboxTerraService,
    TerraDsProcessorService,
  ],
  exports: [StoreService],
})
export class IndexerModule {}
