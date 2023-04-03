// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  ApiService,
  DbModule,
  MmrService,
  StoreCacheService,
  StoreService,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { DsProcessorService } from '../indexer/ds-processor.service';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { UnfinalizedBlocksService } from '../indexer/unfinalizedBlocks.service';
import { ForceCleanService } from './forceClean.service';
import { ReindexService } from './reindex.service';

@Module({
  providers: [
    StoreCacheService,
    StoreService,
    ReindexService,
    MmrService,
    ForceCleanService,
    UnfinalizedBlocksService,
    DynamicDsService,
    DsProcessorService,
    {
      // Used to work with DI for unfinalizedBlocksService but not used with reindex
      provide: ApiService,
      useFactory: () => undefined,
    },
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
