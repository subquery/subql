// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module, OnApplicationBootstrap } from '@nestjs/common';
// import { SequelizeModule } from '@nestjs/sequelize';

import { AppService } from './app.service';
import { IndexerModule } from './indexer/indexer.module';
import { DbModule } from './db/db.module';
import { ConfigureModule } from './configure/configure.module';

export class NodeOption {}

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
    IndexerModule,
  ],
  controllers: [],
  // providers: [RunnerManager],
})
export class AppModule {}
