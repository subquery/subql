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
    logger.info('Starting MMR migration process...');

    const app = await NestFactory.create(MMRMigrateModule);
    await app.init();

    logger.info('MMRMigrateModule initialized.');

    const mmrMigrateService = app.get(MMRMigrateService);
    logger.info(`Migrating MMR data in ${direction} direction...`);
    await mmrMigrateService.migrate(direction);

    logger.info('MMR migration completed successfully.');
  } catch (e) {
    logger.error(e, 'MMR migration failed to execute');
    process.exit(1);
  }

  process.exit(0);
}
