// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  WorkerDynamicDsService,
  WorkerConnectionPoolStateManager,
  ConnectionPoolStateManager,
  NodeConfig,
} from '@subql/node-core';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { ApiPromiseConnection } from '../apiPromise.connection';
import { DsProcessorService } from '../ds-processor.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { ProjectService } from '../project.service';
import { WorkerRuntimeService } from '../runtime/workerRuntimeService';
import { SandboxService } from '../sandbox.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { WorkerService } from './worker.service';
import { WorkerUnfinalizedBlocksService } from './worker.unfinalizedBlocks.service';

/**
 * The alternative version of FetchModule for worker
 */

@Module({
  providers: [
    IndexerManager,
    {
      provide: ConnectionPoolStateManager,
      useFactory: () => {
        if (isMainThread) {
          throw new Error('Expected to be worker thread');
        }
        return new WorkerConnectionPoolStateManager((global as any).host);
      },
    },
    ConnectionPoolService,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
        eventEmitter: EventEmitter2,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new ApiService(
          project,
          connectionPoolService,
          eventEmitter,
          nodeConfig,
        );
        await apiService.init();
        return apiService;
      },
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
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
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: UnfinalizedBlocksService,
      useFactory: () => {
        if (isMainThread) {
          throw new Error('Expected to be worker thread');
        }
        return new WorkerUnfinalizedBlocksService((global as any).host);
      },
    },
    WorkerService,
    WorkerRuntimeService,
  ],
  exports: [],
})
export class WorkerFetchModule {}
