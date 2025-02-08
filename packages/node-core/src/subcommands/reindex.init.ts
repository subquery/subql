// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NestFactory} from '@nestjs/core';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {ReindexService} from './reindex.service';

const logger = getLogger('CLI-Reindex');
export async function reindexInit(reindexModule: any, targetHeight: number): Promise<void> {
  try {
    const app = await NestFactory.create(reindexModule);

    await app.init();
    const reindexService = app.get(ReindexService);

    await reindexService.init();
    const actualReindex = await reindexService.getTargetHeightWithUnfinalizedBlocks(targetHeight);
    if (actualReindex.blockHeight !== targetHeight) {
      logger.info(
        `Found index target height ${targetHeight} beyond indexed unfinalized block ${actualReindex.blockHeight}, will index to ${actualReindex.blockHeight}`
      );
    }

    await reindexService.reindex(actualReindex);
  } catch (e: any) {
    exitWithError(new Error(`Reindex failed to execute`, {cause: e}), logger);
  }
  process.exit(0);
}
