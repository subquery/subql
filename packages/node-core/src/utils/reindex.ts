// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {DynamicDsService, IUnfinalizedBlocksService, StoreService, PoiService} from '../indexer';
import {getLogger} from '../logger';
import {ForceCleanService} from '../subcommands';

const logger = getLogger('Reindex');

/**
 * Reindex the project to ${targetBlockHeight} (continue indexing after this height)
 * reset project if ${targetBlockHeight} <= startHeight
 * - storeCache is handled first, flush cached content before the actual rewind starts
 * - rewind is usually triggered by signal from unfinalizedBlockService, so some state cleanup is required there. FIXME
 * - dynamicDsService will need to look after, clean all ds that added after the targetHeight
 * - poi need to cope with rewind as well. FIXME
 * - in the end, update metadata to targetHeight
 * @param startHeight
 * @param blockOffset
 * @param targetBlockHeight !IMPORTANT! this height is exclusive in the reindex operation
 * @param lastProcessedHeight
 * @param storeService
 * @param unfinalizedBlockService
 * @param dynamicDsService
 * @param sequelize
 * @param PoiService
 * @param forceCleanService
 * @param latestSyncedPoiHeight
 */
export async function reindex(
  startHeight: number,
  targetBlockHeight: number,
  lastProcessedHeight: number,
  storeService: StoreService,
  unfinalizedBlockService: IUnfinalizedBlocksService<any>,
  dynamicDsService: DynamicDsService<any>,
  sequelize: Sequelize,
  poiService?: PoiService,
  forceCleanService?: ForceCleanService
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
        poiService?.rewind(targetBlockHeight, transaction),
      ]);
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
