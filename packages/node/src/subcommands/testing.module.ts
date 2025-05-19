// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  TestRunner,
  NodeConfig,
  ProjectService,
  TestingCoreModule,
  DsProcessorService,
  DynamicDsService,
  UnfinalizedBlocksService,
  MultiChainRewindService,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { RuntimeService } from '../indexer/runtime/runtimeService';

@Module({
  imports: [TestingCoreModule],
  providers: [
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: 'APIService',
      useFactory: ApiService.init,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      provide: 'RuntimeService',
      useClass: RuntimeService,
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    TestRunner,
    {
      provide: 'IIndexerManager',
      useClass: IndexerManager,
    },
    DsProcessorService,
    DynamicDsService,
    MultiChainRewindService,
  ],
  controllers: [],
  exports: [TestRunner],
})
export class TestingFeatureModule {}
