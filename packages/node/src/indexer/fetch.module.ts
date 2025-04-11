// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  NodeConfig,
  ConnectionPoolStateManager,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  ConnectionPoolService,
  UnfinalizedBlocksService,
  DsProcessorService,
  ProjectService,
  DynamicDsService,
  FetchService,
  DictionaryService,
  MultiChainRewindService,
  blockDispatcherFactory,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { BlockchainService } from '../blockchain.service';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';
import { SubstrateDictionaryService } from './dictionary/substrateDictionary.service';
import { IndexerManager } from './indexer.manager';
import { RuntimeService } from './runtime/runtimeService';
import { BlockContent, LightBlockContent } from './types';
import { IIndexerWorker } from './worker/worker';

@Module({
  imports: [CoreModule],
  providers: [
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
      provide: 'RuntimeService',
      useClass: RuntimeService,
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    DsProcessorService,
    DynamicDsService,
    {
      provide: 'IUnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    MultiChainRewindService,
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: blockDispatcherFactory<
        SubstrateDatasource,
        BlockContent | LightBlockContent,
        ApiPromiseConnection,
        IIndexerWorker
      >(path.resolve(__dirname, '../../dist/indexer/worker/worker.js'), [
        'syncRuntimeService',
        'getSpecFromMap',
      ]),
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
    {
      provide: DictionaryService,
      useClass: SubstrateDictionaryService,
    },
    FetchService,
  ],
})
export class FetchModule {}
