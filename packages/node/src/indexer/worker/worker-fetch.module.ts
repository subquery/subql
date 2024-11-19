// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  NodeConfig,
  WorkerCoreModule,
  ProjectService,
  DsProcessorService,
} from '@subql/node-core';
import { BlockchainService } from '../../blockchain.service';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { WorkerRuntimeService } from '../runtime/workerRuntimeService';
import { WorkerService } from './worker.service';

/**
 * The alternative version of FetchModule for worker
 */

@Module({
  imports: [WorkerCoreModule],
  providers: [
    DsProcessorService,
    IndexerManager,
    {
      provide: 'APIService',
      useFactory: ApiService.create,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    // This is alised so it satisfies the BlockchainService, other services are updated to reflect this
    // TODO find a way to remove the alias, currently theres no common interface between worker and non-worker
    {
      provide: 'RuntimeService',
      useClass: WorkerRuntimeService,
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    WorkerService,
  ],
  exports: [],
})
export class WorkerFetchModule {}
