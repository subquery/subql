// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  StoreService,
  PoiSyncService,
  ApiService,
  ConnectionPoolService,
  IStoreModelProvider,
  ConnectionPoolStateManager,
  NodeConfig,
  IProjectUpgradeService,
  ProjectUpgradeService,
  InMemoryCacheService,
  MonitorService,
  CoreModule,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApiConnection } from '../stellar/api.connection';
import { StellarApiService } from '../stellar/api.service.stellar';
import {
  BlockDispatcherService,
  WorkerBlockDispatcherService,
} from './blockDispatcher';
import { StellarDictionaryService } from './dictionary';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Module({
  imports: [CoreModule],
  providers: [
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        projectUpgradeService: ProjectUpgradeService,
        connectionPoolService: ConnectionPoolService<StellarApiConnection>,
        eventEmitter: EventEmitter2,
        nodeConfig: NodeConfig,
      ) => {
        const apiService = new StellarApiService(
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
        'IProjectUpgradeService',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    IndexerManager,
    {
      provide: 'IBlockDispatcher',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        projectService: ProjectService,
        projectUpgradeService: IProjectUpgradeService,
        apiService: ApiService,
        indexerManager: IndexerManager,
        cacheService: InMemoryCacheService,
        storeService: StoreService,
        storeModelProvider: IStoreModelProvider,
        poiSyncService: PoiSyncService,
        project: SubqueryProject,
        dynamicDsService: DynamicDsService,
        unfinalizedBlocks: UnfinalizedBlocksService,
        connectionPoolState: ConnectionPoolStateManager<StellarApiConnection>,
        monitorService?: MonitorService,
      ) =>
        nodeConfig.workers
          ? new WorkerBlockDispatcherService(
              nodeConfig,
              eventEmitter,
              projectService,
              projectUpgradeService,
              cacheService,
              storeService,
              storeModelProvider,
              poiSyncService,
              project,
              dynamicDsService,
              unfinalizedBlocks,
              connectionPoolState,
              monitorService,
            )
          : new BlockDispatcherService(
              apiService,
              nodeConfig,
              indexerManager,
              eventEmitter,
              projectService,
              projectUpgradeService,
              storeService,
              storeModelProvider,
              poiSyncService,
              project,
            ),
      inject: [
        NodeConfig,
        EventEmitter2,
        'IProjectService',
        'IProjectUpgradeService',
        ApiService,
        IndexerManager,
        InMemoryCacheService,
        StoreService,
        'IStoreModelProvider',
        PoiSyncService,
        'ISubqueryProject',
        DynamicDsService,
        UnfinalizedBlocksService,
        ConnectionPoolStateManager,
        MonitorService,
      ],
    },
    FetchService,
    StellarDictionaryService,
    DsProcessorService,
    DynamicDsService,
    {
      useClass: ProjectService,
      provide: 'IProjectService',
    },
    UnfinalizedBlocksService,
  ],
})
export class FetchModule {}
