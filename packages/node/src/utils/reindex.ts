// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLogger, MmrService, StoreService } from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { DynamicDsService } from '../indexer/dynamic-ds.service';
import { ForceCleanService } from '../subcommands/forceClean.service';

const logger = getLogger('Reindex');

export async function reindex(
  startHeight: number,
  blockOffset: number | undefined,
  targetBlockHeight: number,
  lastProcessedHeight: number,
  storeService: StoreService,
  dynamicDsService: DynamicDsService,
  mmrService: MmrService,
  sequelize: Sequelize,
  forceCleanService?: ForceCleanService,
): Promise<void> {
  if (!storeService.historical) {
    logger.warn('Unable to reindex, historical state not enabled');
    return;
  }
  if (!lastProcessedHeight || lastProcessedHeight < targetBlockHeight) {
    logger.warn(
      `Skipping reindexing to block ${targetBlockHeight}: current indexing height ${lastProcessedHeight} is behind requested block`,
    );
    return;
  }

  // if startHeight is greater than the targetHeight, just force clean
  if (targetBlockHeight < startHeight) {
    logger.info(
      `targetHeight: ${targetBlockHeight} is less than startHeight: ${startHeight}. Hence executing force-clean`,
    );
    if (!forceCleanService) {
      logger.error('ForceCleanService not provided, cannot force clean');
      process.exit(1);
    }
    await forceCleanService.forceClean();
  } else {
    logger.info(`Reindexing to block: ${targetBlockHeight}`);
    const transaction = await sequelize.transaction();
    try {
      await Promise.all([
        storeService.rewind(targetBlockHeight, transaction),
        dynamicDsService.resetDynamicDatasource(targetBlockHeight, transaction),
      ]);

      if (blockOffset) {
        await mmrService.deleteMmrNode(targetBlockHeight + 1, blockOffset);
      }
      await transaction.commit();
      logger.info('Reindex Success');
    } catch (err) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
