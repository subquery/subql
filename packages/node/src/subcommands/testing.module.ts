// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import {
  ApiService,
  ConnectionPoolService,
  ConnectionPoolStateManager,
  DbModule,
  InMemoryCacheService,
  PoiService,
  PoiSyncService,
  ProjectUpgradeService,
  StoreService,
  TestRunner,
  SandboxService,
  NodeConfig,
  storeModelFactory,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { StellarApiService } from '../stellar';
import { StellarApiConnection } from '../stellar/api.connection';
import { TestingService } from './testing.service';

@Module({
  providers: [
    InMemoryCacheService,
    StoreService,
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, SchedulerRegistry, Sequelize],
    },
    TestingService,
    EventEmitter2,
    PoiService,
    PoiSyncService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    UnfinalizedBlocksService,
    ConnectionPoolService,
    ConnectionPoolStateManager,
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
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
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    TestRunner,
    {
      provide: 'IApi',
      useClass: StellarApiService,
    },
    {
      provide: 'IIndexerManager',
      useClass: IndexerManager,
    },
    IndexerManager,
    SchedulerRegistry,
  ],

  controllers: [],
  exports: [TestRunner],
})
export class TestingFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TestingFeatureModule,
  ],
  controllers: [],
})
export class TestingModule {}
