// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {DynamicDsService, IUnfinalizedBlocksService, StoreService} from '../indexer';
import {getLogger} from '../logger';
import {ForceCleanService} from '../subcommands';

const logger = getLogger('Reindex');

export async function reindex(
  startHeight: number,
  targetBlockHeight: number,
  lastProcessedHeight: number,
  storeService: StoreService,
  unfinalizedBlockService: IUnfinalizedBlocksService<any>,
  dynamicDsService: DynamicDsService<any>,
  sequelize: Sequelize,
  forceCleanService?: ForceCleanService,
  latestSyncedPoiHeight?: number
): Promise<void> {
  if (!lastProcessedHeight || lastProcessedHeight < targetBlockHeight) {
    logger.warn(
      `Skipping reindexing to block ${targetBlockHeight}: current indexing height ${lastProcessedHeight} is behind requested block`
    );
    return;
  }

  // if startHeight is greater than the targetHeight, just force clean
  if (targetBlockHeight < startHeight) {
    logger.info(
      `targetHeight: ${targetBlockHeight} is less than startHeight: ${startHeight}. Hence executing force-clean`
    );
    if (!forceCleanService) {
      logger.error('ForceCleanService not provided, cannot force clean');
      process.exit(1);
    }
    await storeService.storeCache.resetCache();
    await forceCleanService.forceClean();
  } else {
    logger.info(`Reindexing to block: ${targetBlockHeight}`);
    await storeService.storeCache.flushCache(true, false);
    await storeService.storeCache.resetCache();
    const transaction = await sequelize.transaction();
    try {
      await Promise.all([
        storeService.rewind(targetBlockHeight, transaction),
        unfinalizedBlockService.resetUnfinalizedBlocks(), // TODO: may not needed for nonfinalized chains
        unfinalizedBlockService.resetLastFinalizedVerifiedHeight(), // TODO: may not needed for nonfinalized chains
        dynamicDsService.resetDynamicDatasource(targetBlockHeight),
      ]);
      if (latestSyncedPoiHeight !== undefined && latestSyncedPoiHeight > targetBlockHeight) {
        storeService.storeCache.metadata.set('latestSyncedPoiHeight', targetBlockHeight);
      }
      // Flush metadata changes from above Promise.all
      await storeService.storeCache.metadata.flush(transaction);

      await transaction.commit();
      logger.info('Reindex Success');
    } catch (err: any) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
