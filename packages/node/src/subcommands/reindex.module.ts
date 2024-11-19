// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  DbModule,
  ForceCleanService,
  StoreCacheService,
  ReindexService,
  StoreService,
  PoiService,
  DsProcessorService,
  UnfinalizedBlocksService,
  DynamicDsService,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  providers: [
    StoreCacheService,
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
    {
      // Used to work with DI for unfinalizedBlocksService but not used with reindex
      provide: 'APIService',
      useFactory: () => undefined,
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
