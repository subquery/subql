// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import path from 'path';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule, CoreModule, MetaModule } from '@subql/node-core';
import { ConfigureModule } from './configure/configure.module';
import { FetchModule } from './indexer/fetch.module';

// TODO, Alternative approach, ERROR Uncaught Exception Error: Package subpath './package.json' is not defined by "exports" in xxxxx/node_modules/stellar-sdk/package.json
const packageJsonPath = path.resolve(
  require.resolve('@stellar/stellar-sdk'),
  '../../package.json',
);
const { version: stellarSdkVersion } = JSON.parse(
  fs.readFileSync(packageJsonPath, 'utf8'),
);
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
      sdkVersion: { name: '@stellar/stellar-sdk', version: stellarSdkVersion },
    }),
  ],
  controllers: [],
})
export class AppModule {}
