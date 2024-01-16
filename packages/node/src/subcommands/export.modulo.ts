// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DbModule, ExportService } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  providers: [ExportService, SchedulerRegistry],
  controllers: [],
})
export class ExportFeatureModulo {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ExportFeatureModulo,
  ],
  controllers: [],
})
export class ExportModulo {}
