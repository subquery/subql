// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule, NodeConfig, MMRMigrateService } from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { ConfigureModule } from '../configure/configure.module';

@Module({
  providers: [
    {
      provide: MMRMigrateService,
      useFactory: (config: NodeConfig, sequelize: Sequelize) => {
        return new MMRMigrateService(config, sequelize);
      },
      inject: [NodeConfig, Sequelize],
    },
  ],
  controllers: [],
})
export class MMRMigrateFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    MMRMigrateFeatureModule,
  ],
  controllers: [],
})
export class MMRMigrateModule {}
