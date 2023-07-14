// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from '@subql/node-core';
import { ConfigureModule } from '../../configure/configure.module';
import { IndexerModule } from '../indexer.module';

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    IndexerModule,
  ],
  controllers: [],
})
export class WorkerModule {}
