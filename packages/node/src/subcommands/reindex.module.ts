// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  ApiService,
  DbModule,
  ForceCleanService,
  StoreService,
  ReindexService,
  storeModelFactory,
  NodeConfig,
  ConnectionPoolService,
  ConnectionPoolStateManager,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { StellarApiService } from '../stellar';
import { StellarApiConnection } from '../stellar/api.connection';

@Module({
  providers: [
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, SchedulerRegistry, Sequelize],
    },
    StoreService,
    ReindexService,
    ForceCleanService,
    {
      provide: 'UnfinalizedBlocksService',
      useClass: UnfinalizedBlocksService,
    },
    {
      provide: 'DynamicDsService',
      useClass: DynamicDsService,
    },
    DsProcessorService,
    ConnectionPoolService,
    ConnectionPoolStateManager,
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
    SchedulerRegistry,
  ],
  controllers: [],
})
export class ReindexFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ReindexFeatureModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
})
export class ReindexModule {}
