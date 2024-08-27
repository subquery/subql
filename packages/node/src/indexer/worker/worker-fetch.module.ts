// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkerCoreModule,
  ConnectionPoolService,
  WorkerDynamicDsService,
  NodeConfig,
  WorkerUnfinalizedBlocksService,
  ApiService,
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
  imports: [WorkerCoreModule],
  providers: [
    IndexerManager,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<StellarApiConnection>,
        eventEmitter: EventEmitter2,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new StellarApiService(
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
        'IProjectUpgradeService',
        ConnectionPoolService,
        EventEmitter2,
      ],
    },
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
  ],
})
export class WorkerFetchModule {}
