// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Module} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  InMemoryCacheService,
  PoiService,
  PoiSyncService,
  StoreService,
  SandboxService,
  DsProcessorService,
  UnfinalizedBlocksService,
  DynamicDsService,
  storeModelFactory,
  NodeConfig,
} from '@subql/node-core';
import {Sequelize} from '@subql/x-sequelize';

@Module({
  providers: [
    SchedulerRegistry,
    InMemoryCacheService,
    StoreService,
    {
      provide: 'IStoreModelProvider',
      useFactory: storeModelFactory,
      inject: [NodeConfig, EventEmitter2, Sequelize],
    },
    EventEmitter2,
    PoiService,
    PoiSyncService,
    SandboxService,
    DsProcessorService,
    DynamicDsService,
    UnfinalizedBlocksService,
    ConnectionPoolStateManager,
    ConnectionPoolService,
  ],
  exports: [
    DsProcessorService,
    PoiService,
    PoiSyncService,
    StoreService,
    DynamicDsService,
    UnfinalizedBlocksService,
    SandboxService,
  ],
})
export class TestingCoreModule {}
