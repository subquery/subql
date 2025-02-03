// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  DbModule,
  ForceCleanService,
  ReindexService,
  StoreService,
  PoiService,
  ConnectionPoolService,
  NodeConfig,
  ConnectionPoolStateManager,
  storeModelFactory,
  DsProcessorService,
  UnfinalizedBlocksService,
  DynamicDsService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { BlockchainService } from '../blockchain.service';
import { ConfigureModule } from '../configure/configure.module';
import { ApiService } from '../indexer/api.service';
import { RuntimeService } from '../indexer/runtime/runtimeService';

@Module({
  providers: [
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, Sequelize],
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
      provide: 'APIService',
      useFactory: ApiService.init,
      inject: [
        'ISubqueryProject',
        ConnectionPoolService,
        EventEmitter2,
        NodeConfig,
      ],
    },
    {
      provide: 'RuntimeService', // TODO DOING this because of circular reference with dictionary service
      useFactory: (apiService: ApiService) => new RuntimeService(apiService),
      inject: ['APIService'],
    },
    {
      provide: 'IBlockchainService',
      useClass: BlockchainService,
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
