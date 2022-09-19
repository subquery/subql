// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import {
  DbModule,
  MmrService,
  NodeConfig,
  StoreService,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { ReindexService } from './reindex.service';

@Module({
  imports: [DbModule.forFeature(['Subquery'])],
  // needed providers
  // Sequelize ( from forRoot)
  // NodeConfig ( from register() )
  // storeService
  // mmrService
  providers: [StoreService, ReindexService, MmrService],
  controllers: [],
})
export class ReindexFeatureModule {}

@Module({
  imports: [
    DbModule.forRoot({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASS ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'postgres',
    }),
    ConfigureModule.register(),
    ReindexFeatureModule,
  ],
  controllers: [],
})
export class ReindexModule {}
