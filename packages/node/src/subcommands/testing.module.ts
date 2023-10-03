// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  DbModule,
  PoiService,
  StoreService,
  TestRunner,
} from '@subql/node-core';
import { StoreCacheService } from '@subql/node-core/dist';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { CosmosClientConnection } from '../indexer/cosmosClient.connection';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { SandboxService } from '../indexer/sandbox.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Module({
  providers: [
    StoreService,
    StoreCacheService,
    EventEmitter2,
    PoiService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    UnfinalizedBlocksService,
    ConnectionPoolStateManager,
    ConnectionPoolService,
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<CosmosClientConnection>,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new ApiService(
          project,
          connectionPoolService,
          eventEmitter,
        );
        await apiService.init();
        return apiService;
      },
      inject: ['ISubqueryProject', ConnectionPoolService, EventEmitter2],
    },
    SchedulerRegistry,
    TestRunner,
    {
      provide: 'IApi',
      useClass: ApiService,
    },
    {
      provide: 'IIndexerManager',
      useClass: IndexerManager,
    },
  ],

  controllers: [],
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
