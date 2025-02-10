// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule, CoreModule, MetaModule } from '@subql/node-core';
import { ConfigureModule } from './configure/configure.module';
import { FetchModule } from './indexer/fetch.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: ethersSdkVersion } = require('ethers/package.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../package.json');

@Module({
  imports: [
    DbModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigureModule.register(),
    ScheduleModule.forRoot(),
    CoreModule,
    FetchModule,
    MetaModule.forRoot({
      version: packageVersion,
      sdkVersion: { name: 'ethers.js', version: ethersSdkVersion },
    }),
  ],
  controllers: [],
})
export class AppModule {}
