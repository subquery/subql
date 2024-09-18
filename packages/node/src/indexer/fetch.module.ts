// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  NodeConfig,
  StoreCacheService,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  UnfinalizedBlocksService,
  BlockDispatcher,
  ConnectionPoolService,
  DsProcessorService,
  ProjectService,
  DynamicDsService,
  WorkerBlockDispatcher,
  FetchService,
  DictionaryService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { BlockchainService } from '../blockchain.service';
import { SubqueryProject } from '../configure/SubqueryProject';
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
      useFactory: ApiService.create,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'RuntimeService', // TODO DOING this because of circular reference with dictionary service
      useFactory: (apiService: ApiService) => new RuntimeService(apiService),
      inject: ['APIService'],
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
    },
    /* START: Move to node core */
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
    /* END: Move to node core */
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService<SubstrateDatasource>,
        projectUpgradeService: IProjectUpgradeService,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeCacheService: StoreCacheService,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService<SubstrateDatasource>,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<ApiPromiseConnection>,
        blockchainService: BlockchainService,
        indexerManager: IndexerManager,
        monitorService?: MonitorService,
      ) => {
        return nodeConfig.workers
          ? new WorkerBlockDispatcher<
              SubstrateDatasource,
              IIndexerWorker,
              BlockContent | LightBlockContent,
              ApiPromiseConnection
            >(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeCacheService,
              cacheService,
              poiSyncService,
              dynamicDsService,
              unfinalizedBlocks,
              connectionPoolState,
              project,
              blockchainService,
              path.resolve(__dirname, '../../dist/indexer/worker/worker.js'),
              ['syncRuntimeService', 'getSpecFromMap'],
              monitorService,
            )
          : new BlockDispatcher(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeCacheService,
              poiSyncService,
              project,
              blockchainService,
              indexerManager,
            );
      },
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        InMemoryCacheService,
        StoreService,
        StoreCacheService,
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        'IUnfinalizedBlocksService',
        ConnectionPoolStateManager,
        'IBlockchainService',
        IndexerManager,
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
