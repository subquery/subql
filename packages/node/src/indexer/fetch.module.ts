// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubqlEthereumDataSource } from '@subql/common-ethereum';
import {
  StoreService,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
  IStoreModelProvider,
  ProjectService,
  DynamicDsService,
  WorkerBlockDispatcher,
  BlockDispatcher,
  DsProcessorService,
  FetchService,
  DictionaryService,
} from '@subql/node-core';
import { BlockchainService } from '../blockchain.service';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiConnection } from '../ethereum/api.connection';
import { EthereumApiService } from '../ethereum/api.service.ethereum';
import { EthDictionaryService } from './dictionary/ethDictionary.service';
import { IndexerManager } from './indexer.manager';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  imports: [CoreModule],
  providers: [
    {
      provide: 'APIService',
      useFactory: EthereumApiService.init,
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
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService<SubqlEthereumDataSource>,
        projectUpgradeService: IProjectUpgradeService,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeModelProvider: IStoreModelProvider,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService<SubqlEthereumDataSource>,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<EthereumApiConnection>,
        blockchainService: BlockchainService,
        indexerManager: IndexerManager,
        monitorService?: MonitorService,
      ) =>
        nodeConfig.workers
          ? new WorkerBlockDispatcher(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeModelProvider,
              cacheService,
              poiSyncService,
              dynamicDsService,
              unfinalizedBlocks,
              connectionPoolState,
              project,
              blockchainService,
              path.resolve(__dirname, '../../dist/indexer/worker/worker.js'),
              [],
              monitorService,
            )
          : new BlockDispatcher(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeModelProvider,
              poiSyncService,
              project,
              blockchainService,
              indexerManager,
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
        MonitorService,
      ],
    },
    FetchService,
    {
      provide: DictionaryService,
      useClass: EthDictionaryService,
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
