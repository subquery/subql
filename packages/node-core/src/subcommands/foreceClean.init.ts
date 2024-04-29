// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NestFactory} from '@nestjs/core';
import {getLogger} from '../logger';
import {ForceCleanService} from './forceClean.service';

const logger = getLogger('CLI');
export async function forceClean(forceCleanModule: any): Promise<void> {
  try {
    const app = await NestFactory.create(forceCleanModule);
    await app.init();
    const forceCleanService = app.get(ForceCleanService);
    await forceCleanService.forceClean();
  } catch (e: any) {
    logger.error(e, 'Force-clean failed to execute');
    process.exit(1);
  }

  process.exit(0);
}
