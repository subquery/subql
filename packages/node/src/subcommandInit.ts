// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// import { findAvailablePort } from '@subql/common';
import { findAvailablePort } from '@subql/common';
import { DbModule, getLogger } from '@subql/node-core';
import { ConfigureModule } from './configure/configure.module';
import { SubcommandModule } from './subcommand.module';
import { SubcommandService } from './utils/subcommand.service';

const DEFAULT_PORT = 3000;

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
    SubcommandModule,
  ],
  controllers: [],
})
export class AppModule_2 {}

const logger = getLogger('CLI');
export async function subcommandInit() {
  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port =
    validate(DEFAULT_PORT) ?? (await findAvailablePort(DEFAULT_PORT));

  try {
    const app = await NestFactory.create(AppModule_2);

    await app.init();
    const subcommandService = app.get(SubcommandService);
    await subcommandService.forceClean();

    await app.listen(port);

    logger.info(`Node started on port: ${port}`);

    process.exit(0);
  } catch (e) {
    logger.error(e, 'Subcommand failed to start');
    process.exit(1);
  }
}
