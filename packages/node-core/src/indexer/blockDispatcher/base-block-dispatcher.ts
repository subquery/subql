// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';

import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {hexToU8a, u8aEq} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {NodeConfig, IProjectUpgradeService} from '../../configure';
import {AdminEvent, IndexerEvent, PoiEvent, TargetBlockPayload} from '../../events';
import {getLogger} from '../../logger';
import {monitorCreateBlockFork, monitorCreateBlockStart, monitorWrite} from '../../process';
import {IQueue, mainThreadOnly} from '../../utils';
import {MonitorServiceInterface} from '../monitor.service';
import {PoiBlock, PoiSyncService} from '../poi';
import {SmartBatchService} from '../smartBatch.service';
import {StoreService} from '../store.service';
import {IStoreModelProvider} from '../storeModelProvider';
import {IPoi} from '../storeModelProvider/poi';
import {IBlock, IProjectService, ISubqueryProject} from '../types';

const logger = getLogger('BaseBlockDispatcherService');

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
  blockHash: string;
  reindexBlockHeight: number | null;
};

export interface IBlockDispatcher<B> {
  // now within enqueueBlock should handle getLatestBufferHeight
  enqueueBlocks(heights: (IBlock<B> | number)[], latestBufferHeight: number): void | Promise<void>;
  queueSize: number;
  freeSize: number;
  latestBufferedHeight: number;
  smartBatchSize: number;
  minimumHeapLimit: number;

  // Remove all enqueued blocks, used when a dynamic ds is created
  flushQueue(height: number): void;
}

const NULL_MERKEL_ROOT = hexToU8a('0x00');

function isNullMerkelRoot(operationHash: Uint8Array): boolean {
  return u8aEq(operationHash, NULL_MERKEL_ROOT);
}

export abstract class BaseBlockDispatcher<Q extends IQueue, DS, B> implements IBlockDispatcher<B> {
  protected _latestBufferedHeight = 0;
  protected _processedBlockCount = 0;
  protected _latestProcessedHeight = 0;
  protected currentProcessingHeight = 0;
  private _onDynamicDsCreated?: (height: number) => void;
  private _pendingRewindHeight?: number;

  protected smartBatchService: SmartBatchService;

  constructor(
    protected nodeConfig: NodeConfig,
    protected eventEmitter: EventEmitter2,
    private project: ISubqueryProject,
    protected projectService: IProjectService<DS>,
    private projectUpgradeService: IProjectUpgradeService,
    protected queue: Q,
    protected storeService: StoreService,
    private storeModelProvider: IStoreModelProvider,
    private poiSyncService: PoiSyncService,
    protected monitorService?: MonitorServiceInterface
  ) {
    this.smartBatchService = new SmartBatchService(nodeConfig.batchSize);
  }

  abstract enqueueBlocks(heights: (IBlock<B> | number)[], latestBufferHeight?: number): void | Promise<void>;

  async init(onDynamicDsCreated: (height: number) => void): Promise<void> {
    this._onDynamicDsCreated = onDynamicDsCreated;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.setProcessedBlockCount((await this.storeModelProvider.metadata.find('processedBlockCount', 0))!);
  }

  get queueSize(): number {
    return this.queue.size;
  }

  get freeSize(): number {
    assert(this.queue.freeSpace !== undefined, 'Queues for base block dispatcher must have a capacity set');
    return this.queue.freeSpace;
  }

  get smartBatchSize(): number {
    return this.smartBatchService.getSafeBatchSize();
  }

  get minimumHeapLimit(): number {
    return this.smartBatchService.minimumHeapRequired;
  }

  get latestProcessedHeight(): number {
    return this._latestProcessedHeight;
  }

  setLatestProcessedHeight(height: number): void {
    this._latestProcessedHeight = height;
  }

  protected get onDynamicDsCreated(): (height: number) => void {
    if (!this._onDynamicDsCreated) {
      throw new Error('BaseBlockDispatcher has not been initialized');
    }
    return this._onDynamicDsCreated;
  }

  get latestBufferedHeight(): number {
    return this._latestBufferedHeight;
  }

  set latestBufferedHeight(height: number) {
    this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
      value: this.queueSize,
    });
    this._latestBufferedHeight = height;
  }

  protected setProcessedBlockCount(processedBlockCount: number): void {
    this._processedBlockCount = processedBlockCount;
    this.eventEmitter.emit(IndexerEvent.BlockProcessedCount, {
      processedBlockCount,
      timestamp: Date.now(),
    });
  }

  /**
   * rewind() is called from this.postProcessBlock(),
   * it handles runtime status like compare it with current indexing number, if last corrected is already indexed
   * then dispatch to projectService.reindex()
   * not likely happen but if rewind to future block, flush queue only
   * @param lastCorrectHeight
   */
  @mainThreadOnly()
  protected async rewind(lastCorrectHeight: number): Promise<void> {
    if (lastCorrectHeight <= this.currentProcessingHeight) {
      logger.info(`Found last verified block at height ${lastCorrectHeight}, rewinding...`);
      await this.projectService.reindex(lastCorrectHeight);
      this.setLatestProcessedHeight(lastCorrectHeight);
      logger.info(`Successful rewind to block ${lastCorrectHeight}!`);
    }
    this.flushQueue(lastCorrectHeight);
    logger.info(`Queued blocks flushed!`); //Also last buffered height reset, next fetching should start after lastCorrectHeight
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.queue.flush();
  }

  // Is called directly before a block is processed
  @mainThreadOnly()
  protected async preProcessBlock(height: number): Promise<void> {
    monitorCreateBlockStart(height);
    await this.storeService.setBlockHeight(height);

    await this.projectUpgradeService.setCurrentHeight(height);

    this.currentProcessingHeight = height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height,
      timestamp: Date.now(),
    });
  }

  // Is called directly after a block is processed
  @mainThreadOnly()
  protected async postProcessBlock(height: number, processBlockResponse: ProcessBlockResponse): Promise<void> {
    const {blockHash, dynamicDsCreated, reindexBlockHeight: processReindexBlockHeight} = processBlockResponse;
    // Rewind height received from admin api have higher priority than processed reindexBlockHeight
    const reindexBlockHeight = this._pendingRewindHeight ?? processReindexBlockHeight;
    monitorWrite(`Finished block ${height}`);
    if (reindexBlockHeight !== null && reindexBlockHeight !== undefined) {
      try {
        if (this.nodeConfig.proofOfIndex) {
          await this.poiSyncService.stopSync();
          this.poiSyncService.clear();
          monitorWrite(`poiSyncService stopped, cache cleared`);
        }
        monitorCreateBlockFork(reindexBlockHeight);
        this.resetPendingRewindHeight();
        await this.rewind(reindexBlockHeight);
        this.setLatestProcessedHeight(reindexBlockHeight);
        // Bring poi sync service back to sync again.
        if (this.nodeConfig.proofOfIndex) {
          void this.poiSyncService.syncPoi();
        }
        this.eventEmitter.emit(IndexerEvent.RewindSuccess, {success: true, height: reindexBlockHeight});
        return;
      } catch (e: any) {
        this.eventEmitter.emit(IndexerEvent.RewindFailure, {success: false, message: e.message});
        monitorWrite(`***** Rewind failed: ${e.message}`);
        throw e;
      }
    } else {
      await this.updateStoreMetadata(height, undefined, this.storeService.transaction);

      const operationHash = this.storeService.getOperationMerkleRoot();
      await this.createPOI(height, blockHash, operationHash, this.storeService.transaction);

      if (dynamicDsCreated) {
        this.onDynamicDsCreated(height);
      }
      assert(
        !this.latestProcessedHeight || height > this.latestProcessedHeight,
        `Block processed out of order. Height: ${height}. Latest: ${this.latestProcessedHeight}`
      );
      // In memory _processedBlockCount increase, db metadata increase BlockCount in indexer.manager
      this.setProcessedBlockCount(this._processedBlockCount + 1);
      this.setLatestProcessedHeight(height);
    }

    await this.storeModelProvider.applyPendingChanges(
      height,
      !this.projectService.hasDataSourcesAfterHeight(height),
      this.storeService.transaction
    );

    // if (this.storeModelService instanceof StorCeacheService) {
    //   if (this.nodeConfig.storeCacheAsync) {
    //     // Flush all completed block data and don't wait
    //     await this.storeModelService.flushAndWaitForCapacity(false)?.catch((e) => {
    //       exitWithError(new Error(`Flushing cache failed`, { cause: e }), logger);
    //     });
    //   } else {
    //     // Flush all data from cache and wait
    //     await this.storeModelService.flushCache(false);
    //   }

    //   if (!this.projectService.hasDataSourcesAfterHeight(height)) {
    //     const msg = `All data sources have been processed up to block number ${height}. Exiting gracefully...`;
    //     await this.storeModelService.flushCache(false);
    //     exitWithError(msg, logger, 0);
    //   }
    // } else if (this.storeModelService instanceof PlainStoreModelService) {
    //   const tx = this.storeService.transaction;
    //   if (!tx) {
    //     exitWithError(new Error('Transaction not found'), logger, 1);
    //   }
    //   await tx.commit();

    //   if (!this.projectService.hasDataSourcesAfterHeight(height)) {
    //     const msg = `All data sources have been processed up to block number ${height}. Exiting gracefully...`;
    //     exitWithError(msg, logger, 0);
    //   }
    // } else {
    //   exitWithError(new Error('Unknown store model service'), logger, 1);
    // }
  }

  @OnEvent(AdminEvent.rewindTarget)
  handleAdminRewind(blockPayload: TargetBlockPayload): void {
    if (this.currentProcessingHeight < blockPayload.height) {
      // this will throw back to admin controller, will NOT lead current indexing exit
      throw new Error(
        `Current processing block ${this.currentProcessingHeight}, can not rewind to future block ${blockPayload.height}`
      );
    }
    this._pendingRewindHeight = Number(blockPayload.height);
    const message = `Received admin command to rewind to block ${blockPayload.height}`;
    monitorWrite(`***** [ADMIN] ${message}`);
    logger.warn(message);
  }

  private resetPendingRewindHeight(): void {
    this._pendingRewindHeight = undefined;
  }

  /**
   * If index a block generate store operation, this will create a POI
   * and this createdPoi will be upsert into CachedPoi
   * @param height
   * @param blockHash
   * @param operationHash
   * @private
   */
  private async createPOI(
    height: number,
    blockHash: string,
    operationHash: Uint8Array,
    tx?: Transaction
  ): Promise<void> {
    if (!this.nodeConfig.proofOfIndex) {
      return;
    }
    if (isNullMerkelRoot(operationHash)) {
      return;
    }

    const poiBlock = PoiBlock.create(height, blockHash, operationHash, this.project.id);
    // This is the first creation of POI
    await this.poi.bulkUpsert([poiBlock], tx);
    await this.storeModelProvider.metadata.setBulk([{key: 'lastCreatedPoiHeight', value: height}], tx);
    this.eventEmitter.emit(PoiEvent.PoiTarget, {
      height,
      timestamp: Date.now(),
    });
  }

  @mainThreadOnly()
  private async updateStoreMetadata(height: number, updateProcessed = true, tx?: Transaction): Promise<void> {
    const meta = this.storeModelProvider.metadata;
    // Update store metadata
    await meta.setBulk(
      [
        {key: 'lastProcessedHeight', value: height},
        {key: 'lastProcessedTimestamp', value: Date.now()},
      ],
      tx
    );
    // Db Metadata increase BlockCount, in memory ref to block-dispatcher _processedBlockCount
    if (updateProcessed) {
      await meta.setIncrement('processedBlockCount', undefined, tx);
    }
  }

  private get poi(): IPoi {
    const poi = this.storeModelProvider.poi;
    if (!poi) {
      throw new Error('Poi service expected poi repo but it was not found');
    }
    return poi;
  }
}
