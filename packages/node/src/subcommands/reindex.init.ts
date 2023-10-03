// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { getLogger, ReindexService } from '@subql/node-core';
import { ReindexModule } from './reindex.module';

const logger = getLogger('CLI-Reindex');
export async function reindexInit(targetHeight: number): Promise<void> {
  try {
    const app = await NestFactory.create(ReindexModule);

    await app.init();
    const reindexService = app.get(ReindexService);

    await reindexService.init();
    await reindexService.reindex(targetHeight);
  } catch (e) {
    logger.error(e, 'Reindex failed to execute');
    process.exit(1);
  }
  process.exit(0);
}
