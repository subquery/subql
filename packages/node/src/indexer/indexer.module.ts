// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  PoiService,
  MmrService,
  NodeConfig,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { RuntimeService } from './runtimeService';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';
import { WorkerService } from './worker/worker.service';

@Module({
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
      inject: ['ISubqueryProject', EventEmitter2],
    },
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    DictionaryService,
    ProjectService,
    WorkerService,
    {
      provide: DictionaryService,
      useFactory: async (project: SubqueryProject, nodeConfig: NodeConfig) => {
        const dictionaryService = new DictionaryService(project, nodeConfig);
        await dictionaryService.init();
        return dictionaryService;
      },
      inject: ['ISubqueryProject', NodeConfig],
    },
    RuntimeService,
    UnfinalizedBlocksService,
  ],
  exports: [StoreService, MmrService],
})
export class IndexerModule {}
