// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import {
  ApiService,
  ConnectionPoolService,
  DbModule,
  NodeConfig,
  PoiService,
  StoreService,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiService } from '../ethereum';
import { EthereumApiConnection } from '../ethereum/api.connection';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { FetchModule } from '../indexer/fetch.module';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { SandboxService } from '../indexer/sandbox.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { MetaModule } from '../meta/meta.module';
import { TestingService } from './testing.service';

@Module({
  providers: [
    StoreService,
    TestingService,
    EventEmitter2,
    PoiService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    UnfinalizedBlocksService,
    ProjectService,
    ConnectionPoolService,
    {
      provide: 'IProjectService',
      useClass: ProjectService,
    },
    {
      provide: ApiService,
      useFactory: async (
        project: SubqueryProject,
        connectionPoolService: ConnectionPoolService<EthereumApiConnection>,
        eventEmitter: EventEmitter2,
      ) => {
        const apiService = new EthereumApiService(
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
    SchedulerRegistry,
  ],

  imports: [MetaModule, FetchModule],
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
