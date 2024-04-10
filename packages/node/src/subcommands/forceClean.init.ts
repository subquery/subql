// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { ForceCleanService, getLogger } from '@subql/node-core';
import { ForceCleanModule } from './forceClean.module';

const logger = getLogger('CLI');
export async function forceCleanInit(): Promise<void> {
  try {
    const app = await NestFactory.create(ForceCleanModule);
    await app.init();
    const forceCleanService = app.get(ForceCleanService);
    await forceCleanService.forceClean();
  } catch (e) {
    logger.error(e, 'Force-clean failed to execute');
    process.exit(1);
  }

  process.exit(0);
}
