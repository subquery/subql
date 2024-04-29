// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  ConnectionPoolService,
  WorkerDynamicDsService,
  ConnectionPoolStateManager,
  WorkerConnectionPoolStateManager,
  ProjectUpgradeService,
  InMemoryCacheService,
  WorkerInMemoryCacheService,
  SandboxService,
  WorkerUnfinalizedBlocksService,
} from '@subql/node-core';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { StellarApiService } from '../../stellar';
import { StellarApiConnection } from '../../stellar/api.connection';
import { DsProcessorService } from '../ds-processor.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { ProjectService } from '../project.service';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';
import { WorkerService } from './worker.service';

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
        projectUpgradeService: ProjectUpgradeService,
        connectionPoolService: ConnectionPoolService<StellarApiConnection>,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new StellarApiService(
          project,
          projectUpgradeService,
          connectionPoolService,
          eventEmitter,
        );
        await apiService.init();
        return apiService;
      },
      inject: [
        'ISubqueryProject',
        'IProjectUpgradeService',
        ConnectionPoolService,
        EventEmitter2,
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
    {
      provide: InMemoryCacheService,
      useFactory: () => new WorkerInMemoryCacheService((global as any).host),
    },
  ],
})
export class WorkerFetchModule {}
