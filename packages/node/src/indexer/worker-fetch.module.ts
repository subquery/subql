// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  ConnectionPoolService,
  WorkerDynamicDsService,
  WorkerConnectionPoolStateManager,
  ConnectionPoolStateManager,
  NodeConfig,
  InMemoryCacheService,
  WorkerInMemoryCacheService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiService } from '../ethereum';
import { EthereumApiConnection } from '../ethereum/api.connection';
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
    {
      provide: ConnectionPoolStateManager,
      useFactory: () =>
        new WorkerConnectionPoolStateManager((global as any).host),
    },
    ConnectionPoolService,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
        eventEmitter: EventEmitter2,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new EthereumApiService(
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
      useFactory: () => new WorkerDynamicDsService((global as any).host),
    },
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: UnfinalizedBlocksService,
      useFactory: () =>
        new WorkerUnfinalizedBlocksService((global as any).host),
    },
    WorkerService,
    {
      provide: InMemoryCacheService,
      useFactory: () => new WorkerInMemoryCacheService((global as any).host),
    },
  ],
})
export class WorkerFetchModule {}
