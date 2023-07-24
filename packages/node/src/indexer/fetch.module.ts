// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PoiBenchmarkService,
  IndexingBenchmarkService,
  MmrService,
  StoreService,
  PoiService,
  ApiService,
  NodeConfig,
  ConnectionPoolService,
  SmartBatchService,
  StoreCacheService,
  PgMmrCacheService,
  MmrQueryService,
  ConnectionPoolStateManager,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { SorobanApiConnection } from '../soroban/api.connection';
import { SorobanApiService } from '../soroban/api.service.soroban';
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
    StoreService,
    StoreCacheService,
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<SorobanApiConnection>,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new SorobanApiService(
          project,
          connectionPoolService,
          eventEmitter,
        );
        await apiService.init();
        return apiService;
      },
      inject: ['ISubqueryProject', ConnectionPoolService, EventEmitter2],
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
        apiService: SorobanApiService,
        indexerManager: IndexerManager,
        smartBatchService: SmartBatchService,
        storeService: StoreService,
        storeCacheService: StoreCacheService,
        poiService: PoiService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService,
        unfinalizedBlocks: UnfinalizedBlocksService,
      ) =>
        nodeConfig.workers !== undefined
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
              smartBatchService,
              storeService,
              storeCacheService,
              poiService,
              project,
              dynamicDsService,
              unfinalizedBlocks,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
              smartBatchService,
              storeService,
              storeCacheService,
              poiService,
              project,
              dynamicDsService,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        ApiService,
        IndexerManager,
        SmartBatchService,
        StoreService,
        StoreCacheService,
        PoiService,
        'ISubqueryProject',
        DynamicDsService,
        UnfinalizedBlocksService,
      ],
    },
    FetchService,
    IndexingBenchmarkService,
    PoiBenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    MmrQueryService,
    PgMmrCacheService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    UnfinalizedBlocksService,
  ],
  exports: [StoreService, MmrService, StoreCacheService, MmrQueryService],
})
export class FetchModule {}
