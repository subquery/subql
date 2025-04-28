// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  PoiSyncService,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  blockDispatcherFactory,
  DictionaryService,
  DynamicDsService,
  FetchService,
  DsProcessorService,
  ProjectService,
  UnfinalizedBlocksService,
  MultiChainRewindService,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { StellarApiService } from '../stellar/api.service.stellar';
import { StellarDictionaryService } from './dictionary';
import { IndexerManager } from './indexer.manager';

@Module({
  imports: [CoreModule],
  providers: [
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
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    IndexerManager,
    MultiChainRewindService,
    {
      provide: 'IBlockDispatcher',
      useFactory: blockDispatcherFactory(
        path.resolve(__dirname, '../../dist/indexer/worker/worker.js'),
        [],
      ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        InMemoryCacheService,
        StoreService,
        'IStoreModelProvider',
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        'IUnfinalizedBlocksService',
        ConnectionPoolStateManager,
        'IBlockchainService',
        IndexerManager,
        MultiChainRewindService,
        MonitorService,
      ],
    },
    FetchService,
    {
      provide: DictionaryService,
      useClass: StellarDictionaryService,
    },
    DsProcessorService,
    DynamicDsService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
  ],
})
export class FetchModule {}
