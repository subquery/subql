// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PoiBenchmarkService,
  IndexingBenchmarkService,
  StoreService,
  PoiService,
  PoiSyncService,
  ApiService,
  ConnectionPoolService,
  SmartBatchService,
  StoreCacheService,
  ConnectionPoolStateManager,
  NodeConfig,
  IProjectUpgradeService,
  ProjectUpgradeService,
  InMemoryCacheService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApiConnection } from '../stellar/api.connection';
import { StellarApiService } from '../stellar/api.service.stellar';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
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
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        projectUpgradeService: ProjectUpgradeService,
        connectionPoolService: ConnectionPoolService<StellarApiConnection>,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new StellarApiService(
          project,
          projectUpgradeService,
          connectionPoolService,
          eventEmitter,
        );
        await apiService.init();
        return apiService;
      },
      inject: [
        'ISubqueryProject',
        'IProjectUpgradeService',
        ConnectionPoolService,
        EventEmitter2,
      ],
    },
    IndexerManager,
    ConnectionPoolService,
    ConnectionPoolStateManager,
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
        apiService: ApiService,
        indexerManager: IndexerManager,
        smartBatchService: SmartBatchService,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeCacheService: StoreCacheService,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<StellarApiConnection>,
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
    IndexingBenchmarkService,
    PoiBenchmarkService,
    {
      provide: DictionaryService,
      useFactory: async (
        project: SubqueryProject,
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
      ) => {
        const dictionaryService = await DictionaryService.create(
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
