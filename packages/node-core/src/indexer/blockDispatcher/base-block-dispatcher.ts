// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';

import {EventEmitter2, OnEvent} from '@nestjs/event-emitter';
import {ICoreBlockchainService} from '@subql/node-core/blockchain.service';
import {hexToU8a, u8aEq} from '@subql/utils';
import {Transaction} from '@subql/x-sequelize';
import {NodeConfig, IProjectUpgradeService} from '../../configure';
import {AdminEvent, IndexerEvent, PoiEvent, TargetBlockPayload} from '../../events';
import {getLogger} from '../../logger';
import {exitWithError, monitorCreateBlockFork, monitorCreateBlockStart, monitorWrite} from '../../process';
import {AutoQueue, IQueue, isTaskFlushedError, mainThreadOnly} from '../../utils';
import {MultiChainRewindService} from '../multiChainRewind.service';
import {PoiBlock, PoiSyncService} from '../poi';
import {StoreService} from '../store.service';
import {IStoreModelProvider, StoreCacheService} from '../storeModelProvider';
import {IPoi} from '../storeModelProvider/poi';
import {Header, IBlock, IProjectService, ISubqueryProject} from '../types';
import {isBlockUnavailableError} from '../worker';

const logger = getLogger('BaseBlockDispatcherService');

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
  reindexBlockHeader: Header | null;
};

export interface IBlockDispatcher<B> {
  init(onDynamicDsCreated: (height: number) => void): Promise<void>;
  // now within enqueueBlock should handle getLatestBufferHeight
  enqueueBlocks(heights: (IBlock<B> | number)[], latestBufferHeight: number): void | Promise<void>;
  queueSize: number;
  freeSize: number;
  latestBufferedHeight: number;
  batchSize: number;

  setLatestProcessedHeight(height: number): void;
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
  private _pendingRewindHeader?: Header;

  protected isShutdown = false;

  /* The height at which a block fetch failure first ocurrs, ensuring that we don't process any blocks after this */
  protected fetchFailureHeight?: number;

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
    private blockChainService: ICoreBlockchainService,
    private multiChainRewindService: MultiChainRewindService
  ) {}

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

  get batchSize(): number {
    return this.nodeConfig.batchSize;
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
  protected async rewind(lastCorrectHeader: Header): Promise<void> {
    if (lastCorrectHeader.blockHeight <= this.currentProcessingHeight) {
      logger.info(`Found last verified block at height ${lastCorrectHeader.blockHeight}, rewinding...`);
      await this.projectService.reindex(lastCorrectHeader);
      this.setLatestProcessedHeight(lastCorrectHeader.blockHeight);
      logger.info(`Successful rewind to block ${lastCorrectHeader.blockHeight}!`);
    }
    this.flushQueue(lastCorrectHeader.blockHeight);
    logger.info(`Queued blocks flushed!`); //Also last buffered height reset, next fetching should start after lastCorrectHeight
  }

  flushQueue(height: number): void {
    logger.info(`Queue flushed, height="${height}"`);
    this.latestBufferedHeight = height;
    this.queue.flush();
  }

  // Is called directly before a block is processed
  @mainThreadOnly()
  protected async preProcessBlock(header: Header): Promise<void> {
    const {blockHeight} = header;
    monitorCreateBlockStart(blockHeight);
    await this.storeService.setBlockHeader(header);

    await this.projectUpgradeService.setCurrentHeight(blockHeight);

    this.currentProcessingHeight = blockHeight;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
  }

  // Is called directly after a block is processed
  @mainThreadOnly()
  protected async postProcessBlock(header: Header, processBlockResponse: ProcessBlockResponse): Promise<void> {
    const {blockHash, blockHeight: height} = header;
    const {dynamicDsCreated, reindexBlockHeader: processReindexBlockHeader} = processBlockResponse;
    // Rewind height received from admin api have higher priority than processed reindexBlockHeight
    const reindexBlockHeader =
      this._pendingRewindHeader ?? this.multiChainRewindService.waitRewindHeader ?? processReindexBlockHeader;
    monitorWrite(`Finished block ${height}`);
    if (reindexBlockHeader !== null && reindexBlockHeader !== undefined) {
      try {
        // End transaction
        await this.storeModelProvider.applyPendingChanges(
          height,
          !this.projectService.hasDataSourcesAfterHeight(height),
          this.storeService.transaction
        );

        if (this.nodeConfig.proofOfIndex) {
          await this.poiSyncService.stopSync();
          this.poiSyncService.clear();
          monitorWrite(`poiSyncService stopped, cache cleared`);
        }
        monitorCreateBlockFork(reindexBlockHeader.blockHeight);
        this.resetPendingRewindHeader();
        await this.rewind(reindexBlockHeader);
        // Bring poi sync service back to sync again.
        if (this.nodeConfig.proofOfIndex) {
          void this.poiSyncService.syncPoi();
        }
        this.eventEmitter.emit(IndexerEvent.RewindSuccess, {success: true, height: reindexBlockHeader.blockHeight});
        return;
      } catch (e: any) {
        this.eventEmitter.emit(IndexerEvent.RewindFailure, {success: false, message: e.message});
        monitorWrite(`***** Rewind failed: ${e.message}`);
        throw e;
      }
    } else {
      await this.updateStoreMetadata(height, header.timestamp, undefined, this.storeService.transaction);

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
  }

  @OnEvent(AdminEvent.rewindTarget)
  async handleAdminRewind(blockPayload: TargetBlockPayload): Promise<void> {
    if (this.currentProcessingHeight < blockPayload.height) {
      // this will throw back to admin controller, will NOT lead current indexing exit
      throw new Error(
        `Current processing block ${this.currentProcessingHeight}, can not rewind to future block ${blockPayload.height}`
      );
    }

    // TODO can this work without
    this._pendingRewindHeader = await this.blockChainService.getHeaderForHeight(blockPayload.height);
    const message = `Received admin command to rewind to block ${blockPayload.height}`;
    monitorWrite(`***** [ADMIN] ${message}`);
    logger.warn(message);
  }

  private resetPendingRewindHeader(): void {
    this._pendingRewindHeader = undefined;
  }

  /**
   * Process a block with any pre and post processing as well as a check to discard the block.
   * */
  private async processBlockTask<T>(
    data: T,
    getHeader: (data: T) => Header,
    discardBlock: (header: Header) => boolean,
    processBlock: (data: T) => Promise<ProcessBlockResponse>
  ): Promise<void> {
    const header = getHeader(data);
    try {
      if (discardBlock(header)) {
        logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
        return;
      }

      await this.preProcessBlock(header);
      const processBlockResponse = await processBlock(data);
      await this.postProcessBlock(header, processBlockResponse);
    } catch (e: any) {
      // TODO discard any cache changes from this block height
      if (this.isShutdown) {
        return;
      }
      logger.error(
        e,
        `Failed to index block at height ${header.blockHeight} ${e.handler ? `${e.handler}(${e.stack ?? ''})` : ''}`
      );
      throw e;
    }
  }

  /**
   * Pipes a pending block to be processed.
   * This includes error handling and will facilitate shutdown.
   * If a block fails to fetch then and existing blocks that need to be fetched are processed before exiting.
   * */
  protected async pipeBlock<T>(options: {
    /**
     * A promise that resolves once the block is fetched.
     * */
    fetchTask: Promise<T>;
    /**
     * A function that triggers the block to be indexed.
     * */
    processBlock: (input: T) => Promise<ProcessBlockResponse>;
    /**
     *  Used to determine if a fetched block should be discarded and not processed. This happens with rewinds
     * */
    discardBlock: (header: Header) => boolean;
    /**
     *  The queue used to process blocks
     * */
    processQueue: AutoQueue<void>;
    /**
     * A function to abort fetching any other blokcs. This is called when there is an error with the fetch task */
    abortFetching: () => Promise<void> | void;
    getHeader: (input: T) => Header;
    height: number;
  }): Promise<void> {
    return options.fetchTask
      .catch(async (e) => {
        // Failed to fetch block
        if (isTaskFlushedError(e)) {
          return;
        }
        if (isBlockUnavailableError(e)) {
          return;
        }

        // Block fetching has failed, start shutting down things. But we can wait until the ramining fetched blocks can be processed
        console.error('ERROR', e);
        logger.error(`Failed to fetch block, waiting for fetched blocks to be processed before shutting down.`, e);
        if (!this.isShutdown) {
          this.isShutdown = true;
          this.fetchFailureHeight = options.height;
          await options.abortFetching();
          // this.fetchQueue.abort();
          // Wait for any pending blocks to be processed
          await options.processQueue.onIdle();
          // Ensure any pending changes are persisted
          if (this.storeModelProvider instanceof StoreCacheService) {
            await this.storeModelProvider.flushData(true);
          }

          exitWithError(new Error(`Failed to fetch block ${options.height}.`, {cause: e}), logger);
        }
      })
      .then((data) => {
        // Don't add more data to index if theres a failure fetching an earlier block
        if (!data || (this.fetchFailureHeight && options.height > this.fetchFailureHeight)) {
          return;
        }

        return options.processQueue
          .put(() => this.processBlockTask(data, options.getHeader, options.discardBlock, options.processBlock))
          .catch((e) => {
            if (isTaskFlushedError(e)) {
              // Do nothing, fetching the block was flushed, this could be caused by forked blocks or dynamic datasources
              return;
            }
            logger.error(e, `Failed to process block ${options.height}`);
            throw e;
          });
      })
      .catch((e: any) => {
        // Failed to process block
        exitWithError(new Error(`Failed to index block ${options.height}`, {cause: e}), logger);
      });
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
  private async updateStoreMetadata(
    height: number,
    blockTimestamp?: Date,
    updateProcessed = true,
    tx?: Transaction
  ): Promise<void> {
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
    if (blockTimestamp) {
      await meta.set('lastProcessedBlockTimestamp', blockTimestamp.getTime(), tx);
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
