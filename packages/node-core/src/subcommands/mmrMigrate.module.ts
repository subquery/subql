// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Module} from '@nestjs/common';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../configure';
import {MMRMigrateService} from '../indexer';

@Module({
  providers: [
    SchedulerRegistry,
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
