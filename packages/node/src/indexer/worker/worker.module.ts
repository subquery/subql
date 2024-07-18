// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkerCoreModule } from '@subql/node-core';
import { ConfigureModule } from '../../configure/configure.module';
import { WorkerFetchModule } from './worker-fetch.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    WorkerCoreModule,
    WorkerFetchModule,
  ],
  controllers: [],
})
export class WorkerModule {}
