// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { reindexInit as baseReindexInit, DbModule } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { ReindexFeatureModule } from './reindex.module';

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

export const reindexInit = (targetHeight: number): Promise<void> =>
  baseReindexInit(ReindexModule, targetHeight);
