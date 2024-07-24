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
  StoreCacheService,
  StoreService,
  SandboxService,
  DsProcessorService,
  UnfinalizedBlocksService,
  DynamicDsService,
} from '@subql/node-core';

@Module({
  providers: [
    SchedulerRegistry,
    InMemoryCacheService,
    StoreService,
    StoreCacheService,
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
