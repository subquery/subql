// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BenchmarkService,
  MmrService,
  StoreService,
  PoiService,
  NodeConfig,
  ConnectionPoolService,
  SmartBatchService,
  StoreCacheService,
  PgMmrCacheService,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
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
import { RuntimeService } from './runtime/runtimeService';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  providers: [
    StoreService,
    StoreCacheService,
    ApiService,
    IndexerManager,
    ConnectionPoolService,
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
        apiService: ApiService,
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
    BenchmarkService,
    DictionaryService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    PoiService,
    MmrService,
    PgMmrCacheService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    UnfinalizedBlocksService,
    RuntimeService,
  ],
  exports: [StoreService, MmrService, StoreCacheService],
})
export class FetchModule {}
