// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DbModule } from '../db/db.module';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import { BenchmarkService } from './benchmark.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
  IBlockDispatcher,
} from './worker/block-dispatcher.service';
// import { BlockDispatcherService } from './worker/worker.service';

const { argv } = getYargsOption();

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
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
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: async (
        apiService: ApiService,
        nodeConfig: NodeConfig,
        indexerManager: IndexerManager,
      ) => {
        if (argv.workers) {
          const workerBlockDispatcher = new WorkerBlockDispatcherService(
            2, //argv.workers,
            nodeConfig.batchSize,
          );

          await workerBlockDispatcher.init();

          return workerBlockDispatcher;
        }

        return new BlockDispatcherService(
          apiService,
          nodeConfig,
          indexerManager,
        );
      },
      inject: [ApiService, NodeConfig, IndexerManager],
    },
    {
      provide: FetchService,
      useFactory: async (
        apiService: ApiService,
        nodeConfig: NodeConfig,
        project: SubqueryProject,
        blockDispatcher: IBlockDispatcher,
        dictionaryService: DictionaryService,
        dsProcessorService: DsProcessorService,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
      ) => {
        await projectService.init();

        const fetchService = new FetchService(
          apiService,
          nodeConfig,
          project,
          blockDispatcher,
          dictionaryService,
          dsProcessorService,
          eventEmitter,
          projectService,
        );

        await fetchService.init();
        return fetchService;
      },
      inject: [
        ApiService,
        NodeConfig,
        SubqueryProject,
        'IBlockDispatcher',
        DictionaryService,
        DsProcessorService,
        EventEmitter2,
        ProjectService,
      ],
    },
    BenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    ProjectService,
  ],
  exports: [StoreService, MmrService],
})
export class FetchModule {}
