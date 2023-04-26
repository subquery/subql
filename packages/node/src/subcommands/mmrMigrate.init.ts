// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import {
  getLogger,
  MigrationDirection,
  MMRMigrateService,
} from '@subql/node-core';
import { MMRMigrateModule } from './mmrMigrate.module';

const logger = getLogger('mmr-migrate');

export async function mmrMigrateInit(
  direction: MigrationDirection,
): Promise<void> {
  try {
    const app = await NestFactory.create(MMRMigrateModule);
    await app.init();

    const mmrMigrateService = app.get(MMRMigrateService);
    await mmrMigrateService.migrate(direction);
  } catch (e) {
    logger.error(e, 'mmr-migrate failed to execute');
    process.exit(1);
  }

  process.exit(0);
}
