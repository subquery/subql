// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  DbModule,
  ForceCleanService,
  StoreCacheService,
  ReindexService,
  StoreService,
  PoiService,
  ConnectionPoolService,
  NodeConfig,
  ConnectionPoolStateManager,
  IStoreModelProvider,
  PlainStoreModelService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { ApiService } from '../indexer/api.service';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';

@Module({
  providers: [
    {
      provide: 'IStoreModelProvider',
      useFactory: (
        nodeConfig: NodeConfig,
        eventEmitter: EventEmitter2,
        schedulerRegistry: SchedulerRegistry,
        sequelize: Sequelize,
      ): IStoreModelProvider => {
        return nodeConfig.enableCache
          ? new StoreCacheService(
              sequelize,
              nodeConfig,
              eventEmitter,
              schedulerRegistry,
            )
          : new PlainStoreModelService(sequelize, nodeConfig);
      },
      inject: [NodeConfig, EventEmitter2, SchedulerRegistry, Sequelize],
    },
    StoreService,
    ReindexService,
    PoiService,
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
    ConnectionPoolStateManager,
    ConnectionPoolService,
    {
      // Used to work with DI for unfinalizedBlocksService but not used with reindex
      provide: ApiService,
      useFactory: ApiService.init,
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
