// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Sequelize} from '@subql/x-sequelize';
import {IProjectUpgradeService, NodeConfig} from '../configure';
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
  MultiChainRewindService,
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
 * @param multichainRewindService
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
  multichainRewindService: MultiChainRewindService,
  poiService?: PoiService,
  forceCleanService?: ForceCleanService
): Promise<void> {
  const lastUnit = storeService.historical === 'timestamp' ? lastProcessed.timestamp : lastProcessed.height;
  const targetUnit = getHistoricalUnit(storeService.historical, targetBlockHeader);

  if (!lastUnit || lastUnit < targetUnit) {
    logger.warn(
      `Skipping reindexing to ${storeService.historical} ${targetUnit}: current indexing height ${lastUnit} is behind requested ${storeService.historical}`
    );
    if (storeService.isMultichain) {
      const tx = await sequelize.transaction();
      await multichainRewindService.releaseChainRewindLock(tx, new Date(targetUnit), new Date(lastUnit || 0));
      await tx.commit();
    }
    return;
  }

  // if startHeight is greater than the targetHeight, just force clean
  // We prevent the entire data from being cleared due to multiple chains because the startblock is uncertain in multi-chain projects.
  if (targetBlockHeader.blockHeight < startHeight && !storeService.isMultichain) {
    logger.info(
      `targetHeight: ${targetBlockHeader.blockHeight} is less than startHeight: ${startHeight}. Hence executing force-clean`
    );
    if (!forceCleanService) {
      exitWithError(`ForceCleanService not provided, cannot force clean`, logger);
    }
    // if DB need rollback? no, because forceCleanService will take care of it
    await cacheProviderResetData(storeService.modelProvider);
    await forceCleanService?.forceClean();
    return;
  }

  logger.info(`Reindexing to ${storeService.historical}: ${targetUnit}`);
  if (storeService.isMultichain) {
    const needRewind = await multichainRewindService.acquireGlobalRewindLock(new Date(targetUnit));
    if (!needRewind) {
      logger.warn(`Rewind to ${storeService.historical} ${targetUnit} is not needed`);
      return;
    }
  }

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
    await projectUpgradeService.rewind(targetBlockHeader.blockHeight, lastProcessed.height, transaction, storeService);

    await Promise.all([
      storeService.rewind(targetBlockHeader, transaction),
      unfinalizedBlockService.resetUnfinalizedBlocks(), // TODO: may not needed for nonfinalized chains
      unfinalizedBlockService.resetLastFinalizedVerifiedHeight(), // TODO: may not needed for nonfinalized chains
      dynamicDsService.resetDynamicDatasource(targetBlockHeader.blockHeight, transaction),
      poiService?.rewind(targetBlockHeader.blockHeight, transaction),
    ]);
    // Flush metadata changes from above Promise.all
    await storeService.modelProvider.metadata.flush?.(transaction, targetUnit);

    // release rewind lock
    if (storeService.isMultichain) {
      await multichainRewindService.releaseChainRewindLock(transaction, new Date(targetUnit));
    }

    await transaction.commit();
    logger.info('Reindex Success');
  } catch (err: any) {
    logger.error(err, 'Reindexing failed');
    await transaction.rollback();
    throw err;
  }
}
