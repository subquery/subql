// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {IProjectUpgradeService} from '../configure';
import {
  DynamicDsService,
  IUnfinalizedBlocksService,
  StoreService,
  PoiService,
  ISubqueryProject,
  StoreCacheService,
  cacheProviderFlushData,
  cacheProviderResetData,
  Header,
} from '../indexer';
import {getLogger} from '../logger';
import {exitWithError} from '../process';
import {ForceCleanService} from '../subcommands/forceClean.service';
import {getHistoricalUnit} from './blocks';

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
 * @param targetBlockHeight !IMPORTANT! this height is exclusive in the reindex operation
 * @param lastProcessedHeight
 * @param storeService
 * @param unfinalizedBlockService
 * @param dynamicDsService
 * @param sequelize
 * @param projectUpgradeService
 * @param poiService
 * @param forceCleanService
 */
export async function reindex(
  startHeight: number,
  targetBlockHeader: Header,
  lastProcessed: {height: number; timestamp?: number},
  storeService: StoreService,
  unfinalizedBlockService: IUnfinalizedBlocksService<any>,
  dynamicDsService: DynamicDsService<any>,
  sequelize: Sequelize,
  projectUpgradeService: IProjectUpgradeService<ISubqueryProject>,
  poiService?: PoiService,
  forceCleanService?: ForceCleanService
): Promise<void> {
  const lastUnit = storeService.historical === 'timestamp' ? lastProcessed.timestamp : lastProcessed.height;
  const targetUnit = getHistoricalUnit(storeService.historical, targetBlockHeader);

  if (!lastUnit || lastUnit < targetUnit) {
    logger.warn(
      `Skipping reindexing to ${storeService.historical} ${targetUnit}: current indexing height ${lastUnit} is behind requested ${storeService.historical}`
    );
    return;
  }

  // if startHeight is greater than the targetHeight, just force clean
  if (targetBlockHeader.blockHeight < startHeight) {
    logger.info(
      `targetHeight: ${targetBlockHeader.blockHeight} is less than startHeight: ${startHeight}. Hence executing force-clean`
    );
    if (!forceCleanService) {
      exitWithError(`ForceCleanService not provided, cannot force clean`, logger);
    }
    // if DB need rollback? no, because forceCleanService will take care of it
    await cacheProviderResetData(storeService.modelProvider);
    await forceCleanService?.forceClean();
  } else {
    logger.info(`Reindexing to ${storeService.historical}: ${targetUnit}`);
    await cacheProviderFlushData(storeService.modelProvider, true);
    await cacheProviderResetData(storeService.modelProvider);
    if (storeService.modelProvider instanceof StoreCacheService) {
      await storeService.modelProvider.flushData(true);
      await storeService.modelProvider.resetData();
    }
    const transaction = await sequelize.transaction();
    try {
      /*
      Must initialize storeService, to ensure all models are loaded, as storeService.init has not been called at this point
       1. During runtime, model should be already been init
       2.1 On start, projectUpgrade rewind will sync the sequelize models
       2.2 On start, without projectUpgrade or upgradablePoint, sequelize will sync models through project.service
    */
      await projectUpgradeService.rewind(
        targetBlockHeader.blockHeight,
        lastProcessed.height,
        transaction,
        storeService
      );

      await Promise.all([
        storeService.rewind(targetBlockHeader, transaction),
        unfinalizedBlockService.resetUnfinalizedBlocks(), // TODO: may not needed for nonfinalized chains
        unfinalizedBlockService.resetLastFinalizedVerifiedHeight(), // TODO: may not needed for nonfinalized chains
        dynamicDsService.resetDynamicDatasource(targetBlockHeader.blockHeight, transaction),
        poiService?.rewind(targetBlockHeader.blockHeight, transaction),
      ]);
      // Flush metadata changes from above Promise.all
      await storeService.modelProvider.metadata.flush?.(transaction, targetUnit);

      await transaction.commit();
      logger.info('Reindex Success');
    } catch (err: any) {
      logger.error(err, 'Reindexing failed');
      await transaction.rollback();
      throw err;
    }
  }
}
