// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PoiBenchmarkService,
  IndexingBenchmarkService,
  StoreService,
  PoiService,
  ApiService,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  SmartBatchService,
  StoreCacheService,
  IProjectUpgradeService,
  PoiSyncService,
  InMemoryCacheService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiConnection } from '../ethereum/api.connection';
import { EthereumApiService } from '../ethereum/api.service.ethereum';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './blockDispatcher';
import { EthDictionaryService } from './dictionary/ethDictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  providers: [
    InMemoryCacheService,
    StoreService,
    StoreCacheService,
    EthereumApiService,
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
    IndexerManager,
    ConnectionPoolStateManager,
    ConnectionPoolService,
    {
      provide: SmartBatchService,
      useFactory: (nodeConfig: NodeConfig) => {
        return new SmartBatchService(nodeConfig.batchSize);
      },
      inject: [NodeConfig],
    },
    {
      provide: SmartBatchService,
      useFactory: (nodeConfig: NodeConfig) => {
        return new SmartBatchService(nodeConfig.batchSize);
      },
      inject: [NodeConfig],
    },
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
        projectUpgradeService: IProjectUpgradeService,
        apiService: EthereumApiService,
        indexerManager: IndexerManager,
        smartBatchService: SmartBatchService,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeCacheService: StoreCacheService,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<EthereumApiConnection>,
      ) =>
        nodeConfig.workers !== undefined
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              smartBatchService,
              cacheService,
              storeService,
              storeCacheService,
              poiSyncService,
              project,
              dynamicDsService,
              unfinalizedBlocks,
              connectionPoolState,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
              projectUpgradeService,
              smartBatchService,
              storeService,
              storeCacheService,
              poiSyncService,
              project,
              dynamicDsService,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        ApiService,
        IndexerManager,
        SmartBatchService,
        InMemoryCacheService,
        StoreService,
        StoreCacheService,
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        UnfinalizedBlocksService,
        ConnectionPoolStateManager,
      ],
    },
    FetchService,
    ConnectionPoolService,
    IndexingBenchmarkService,
    PoiBenchmarkService,
    {
      provide: EthDictionaryService,
      useFactory: async (
        project: SubqueryProject,
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        // eslint-disable-next-line @typescript-eslint/require-await
      ) => {
        const dictionaryService = new EthDictionaryService(
          project,
          nodeConfig,
          eventEmitter,
        );
        return dictionaryService;
      },
      inject: ['ISubqueryProject', NodeConfig, EventEmitter2],
    },
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    PoiSyncService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    UnfinalizedBlocksService,
  ],
  exports: [StoreService, StoreCacheService],
})
export class FetchModule {}
