// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule, WorkerCoreModule } from '@subql/node-core';
import { ConfigureModule } from '../../configure/configure.module';
import { WorkerFetchModule } from './worker-fetch.module';

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    WorkerCoreModule,
    WorkerFetchModule,
  ],
  controllers: [],
})
export class WorkerModule {}
