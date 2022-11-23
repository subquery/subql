// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { DbModule, NodeConfig } from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ForceCleanService } from './forceClean.service';

@Module({
  providers: [
    ForceCleanService,
    // {
    //   provide: ForceCleanService,
    //   useFactory: (sequelize:Sequelize, nodeConfig: NodeConfig,project: SubqueryProject) => {
    //     const forceCleanService = new ForceCleanService(sequelize, nodeConfig,project);
    //     return forceCleanService;
    //   },
    //   inject: ['ISubqueryProject', NodeConfig,Sequelize],
    // }
  ],
  controllers: [],
})
export class ForceCleanFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    ForceCleanFeatureModule,
  ],
  controllers: [],
})
export class ForceCleanModule {}
