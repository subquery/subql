// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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
    const actualReindexHeight =
      await reindexService.getTargetHeightWithUnfinalizedBlocks(targetHeight);
    if (actualReindexHeight !== targetHeight) {
      logger.info(
        `Found index target height ${targetHeight} beyond indexed unfinalized block ${actualReindexHeight}, will index to ${actualReindexHeight}`,
      );
    }
    await reindexService.reindex(actualReindexHeight);
  } catch (e) {
    logger.error(e, 'Reindex failed to execute');
    process.exit(1);
  }
  process.exit(0);
}
