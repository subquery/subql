// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule, MMRMigrateFeatureModule } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    MMRMigrateFeatureModule,
  ],
  controllers: [],
})
export class MMRMigrateModule {}
