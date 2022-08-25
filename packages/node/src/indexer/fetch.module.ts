// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ApiService } from '@subql/common-node';
import { AvalancheApiService } from '../avalanche/api.service.avalanche';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DbModule } from '../db/db.module';
import { getYargsOption } from '../yargs';
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

const { argv } = getYargsOption();

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [
    StoreService,
    {
      provide: ApiService,
      useFactory: async (project: SubqueryProject) => {
        const apiService = new AvalancheApiService(project);
        await apiService.init();
        return apiService;
      },
      inject: [SubqueryProject],
    },
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      inject: [SubqueryProject, EventEmitter2],
      useClass: argv.workers
        ? WorkerBlockDispatcherService
        : BlockDispatcherService,
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
        dynamicDsService: DynamicDsService,
        schedulerRegistry: SchedulerRegistry,
      ) => {
        await projectService.init();

        const fetchService = new FetchService(
          apiService,
          nodeConfig,
          project,
          blockDispatcher,
          dictionaryService,
          dsProcessorService,
          dynamicDsService,
          eventEmitter,
          schedulerRegistry,
        );

        await fetchService.init(projectService.startHeight);
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
        DynamicDsService,
        SchedulerRegistry,
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
