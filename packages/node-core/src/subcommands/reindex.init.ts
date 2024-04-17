// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NestFactory} from '@nestjs/core';
import {getLogger} from '../logger';
import {ReindexService} from './reindex.service';

const logger = getLogger('CLI-Reindex');
export async function reindexInit(reindexModule: any, targetHeight: number): Promise<void> {
  try {
    const app = await NestFactory.create(reindexModule);

    await app.init();
    const reindexService = app.get(ReindexService);

    await reindexService.init();
    const actualReindexHeight = await reindexService.getTargetHeightWithUnfinalizedBlocks(targetHeight);
    if (actualReindexHeight !== targetHeight) {
      logger.info(
        `Found index target height ${targetHeight} beyond indexed unfinalized block ${actualReindexHeight}, will index to ${actualReindexHeight}`
      );
    }
    await reindexService.reindex(actualReindexHeight);
  } catch (e: any) {
    logger.error(e, 'Reindex failed to execute');
    process.exit(1);
  }
  process.exit(0);
}
