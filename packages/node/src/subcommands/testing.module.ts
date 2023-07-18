// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import {
  ConnectionPoolService,
  DbModule,
  NodeConfig,
  PoiService,
  StoreService,
  TestRunner,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { ApiPromiseConnection } from '../indexer/apiPromise.connection';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { FetchModule } from '../indexer/fetch.module';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { SandboxService } from '../indexer/sandbox.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { MetaModule } from '../meta/meta.module';

@Module({
  providers: [
    StoreService,
    EventEmitter2,
    PoiService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    ProjectService,
    UnfinalizedBlocksService,
    ConnectionPoolService,
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
        eventEmitter: EventEmitter2,
        config: NodeConfig,
      ) => {
        const apiService = new ApiService(
          project,
          connectionPoolService,
          eventEmitter,
          config,
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

  imports: [MetaModule, FetchModule],
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
