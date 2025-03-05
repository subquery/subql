// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  WorkerCoreModule,
  ConnectionPoolService,
  NodeConfig,
  DsProcessorService,
  ProjectService,
} from '@subql/node-core';
import { BlockchainService } from '../../blockchain.service';
import { StellarApiService } from '../../stellar';
import { IndexerManager } from '../indexer.manager';
import { WorkerService } from './worker.service';

@Module({
  imports: [WorkerCoreModule],
  providers: [
    DsProcessorService,
    IndexerManager,
    {
      provide: 'APIService',
      useFactory: StellarApiService.create.bind(StellarApiService),
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
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    WorkerService,
  ],
})
export class WorkerFetchModule {}
