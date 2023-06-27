// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DbModule, MmrRegenerateFeatureModule } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    MmrRegenerateFeatureModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [],
})
export class MmrRegenerateModule {}
