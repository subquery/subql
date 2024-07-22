// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiService,
  ConnectionPoolService,
  WorkerDynamicDsService,
  NodeConfig,
  WorkerUnfinalizedBlocksService,
  WorkerCoreModule,
} from '@subql/node-core';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { EthereumApiService } from '../../ethereum';
import { EthereumApiConnection } from '../../ethereum/api.connection';
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
  ],
})
export class WorkerFetchModule {}
