// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Module } from '@nestjs/common';
import { DbModule, ForceCleanFeatureModule } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ForceCleanFeatureModule,
  ],
  controllers: [],
})
export class ForceCleanModule {}
