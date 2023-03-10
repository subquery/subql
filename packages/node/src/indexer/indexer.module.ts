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
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { WorkerRuntimeService } from './runtime/workerRuntimeService';
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
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new ApiService(project, eventEmitter, nodeConfig);
        await apiService.init();
        return apiService;
      },
      inject: ['ISubqueryProject', EventEmitter2, NodeConfig],
    },
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    ProjectService,
    WorkerService,
    UnfinalizedBlocksService,
    WorkerRuntimeService,
  ],
  exports: [StoreService, MmrService],
})
export class IndexerModule {}
