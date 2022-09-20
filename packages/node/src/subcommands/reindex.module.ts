// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule, MmrService, StoreService } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { ForceCleanService } from './forceClean.service';
import { ReindexService } from './reindex.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  providers: [StoreService, ReindexService, MmrService, ForceCleanService],
  controllers: [],
})
export class ReindexFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ReindexFeatureModule,
  ],
  controllers: [],
})
export class ReindexModule {}
