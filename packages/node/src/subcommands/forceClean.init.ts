// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { getLogger } from '@subql/node-core';
import { ForceCleanModule } from './forceClean.module';
import { ForceCleanService } from './forceClean.service';

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
