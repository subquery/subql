// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isMainThread } from 'worker_threads';
import { Module } from '@nestjs/common';
import {
  StoreService,
  PoiService,
  MmrService,
  ConnectionPoolService,
  StoreCacheService,
  WorkerDynamicDsService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { CosmosClientConnection } from './cosmosClient.connection';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';
import { WorkerService } from './worker/worker.service';
import { WorkerUnfinalizedBlocksService } from './worker/worker.unfinalizedBlocks.service';

@Module({
  providers: [
    IndexerManager,
    StoreCacheService,
    StoreService,
    ConnectionPoolService,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<CosmosClientConnection>,
      ) => {
        const apiService = new ApiService(project, connectionPoolService);
        await apiService.init();
        return apiService;
      },
      inject: ['ISubqueryProject', ConnectionPoolService],
    },
    SandboxService,
    DsProcessorService,
    {
      provide: DynamicDsService,
      useFactory: () => {
        if (isMainThread) {
          throw new Error('Expected to be worker thread');
        }
        return new WorkerDynamicDsService((global as any).host);
      },
    },
    PoiService,
    MmrService,
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    WorkerService,
    {
      provide: UnfinalizedBlocksService,
      useFactory: () => {
        if (isMainThread) {
          throw new Error('Expected to be worker thread');
        }
        return new WorkerUnfinalizedBlocksService((global as any).host);
      },
    },
  ],
  exports: [StoreService, MmrService],
})
export class IndexerModule {}
