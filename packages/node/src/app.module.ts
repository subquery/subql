// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '@subql/node-core';
import { AdminModule } from './admin/admin.module';
import { ConfigureModule } from './configure/configure.module';
import { FetchModule } from './indexer/fetch.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    FetchModule,
    MetaModule,
    AdminModule,
  ],
  controllers: [],
})
export class AppModule {}
