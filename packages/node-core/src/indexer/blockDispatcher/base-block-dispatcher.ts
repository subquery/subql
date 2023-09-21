// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';

import {EventEmitter2} from '@nestjs/event-emitter';
import {hexToU8a, u8aEq} from '@subql/utils';
import {IProjectUpgradeService, NodeConfig} from '../../configure';
import {IndexerEvent, PoiEvent} from '../../events';
import {getLogger} from '../../logger';
import {IQueue, mainThreadOnly} from '../../utils';
import {DynamicDsService} from '../dynamic-ds.service';
import {PoiBlock, PoiService} from '../poi';
import {SmartBatchService} from '../smartBatch.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {CachePoiModel} from '../storeCache/cachePoi';
import {IProjectService, ISubqueryProject} from '../types';

const logger = getLogger('BaseBlockDispatcherService');

export type ProcessBlockResponse = {
  dynamicDsCreated: boolean;
  blockHash: string;
  reindexBlockHeight: number | null;
};

export interface IBlockDispatcher {
  enqueueBlocks(heights: number[], latestBufferHeight?: number): void | Promise<void>;

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

export abstract class BaseBlockDispatcher<Q extends IQueue, DS> implements IBlockDispatcher {
  protected _latestBufferedHeight = 0;
  protected _processedBlockCount = 0;
  protected _latestProcessedHeight = 0;
  protected currentProcessingHeight = 0;
  private _onDynamicDsCreated?: (height: number) => Promise<void>;

  constructor(
    protected nodeConfig: NodeConfig,
    protected eventEmitter: EventEmitter2,
    private project: ISubqueryProject,
    protected projectService: IProjectService<DS>,
    private projectUpgradeService: IProjectUpgradeService,
    protected queue: Q,
    protected smartBatchService: SmartBatchService,
    protected storeService: StoreService,
    private storeCacheService: StoreCacheService,
    private poiService: PoiService,
    protected dynamicDsService: DynamicDsService<any>
  ) {}

  abstract enqueueBlocks(heights: number[], latestBufferHeight?: number): void | Promise<void>;

  async init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void> {
    this._onDynamicDsCreated = onDynamicDsCreated;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.setProcessedBlockCount((await this.storeCacheService.metadata.find('processedBlockCount', 0))!);
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

  protected get onDynamicDsCreated(): (height: number) => Promise<void> {
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
   * if rollback is greater than current index flush queue only
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
    this.storeService.setBlockHeight(height);

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
    const {blockHash, dynamicDsCreated, reindexBlockHeight} = processBlockResponse;

    if (reindexBlockHeight !== null && reindexBlockHeight !== undefined) {
      await this.rewind(reindexBlockHeight);
      this.setLatestProcessedHeight(reindexBlockHeight);
      return;
    } else {
      this.updateStoreMetadata(height);

      const operationHash = this.storeService.getOperationMerkleRoot();
      await this.createPOI(height, blockHash, operationHash);

      if (dynamicDsCreated) {
        await this.onDynamicDsCreated(height);
      }
      assert(
        !this.latestProcessedHeight || height > this.latestProcessedHeight,
        `Block processed out of order. Height: ${height}. Latest: ${this.latestProcessedHeight}`
      );
      // In memory _processedBlockCount increase, db metadata increase BlockCount in indexer.manager
      this.setProcessedBlockCount(this._processedBlockCount + 1);
      this.setLatestProcessedHeight(height);
    }

    if (this.nodeConfig.storeCacheAsync) {
      // Flush all completed block data and don't wait
      await this.storeCacheService.flushAndWaitForCapacity(false, false)?.catch((e) => {
        logger.error(e, 'Flushing cache failed');
        process.exit(1);
      });
    } else {
      // Flush all data from cache and wait
      await this.storeCacheService.flushCache(false, true);
    }
  }

  // First creation of POI
  private async createPOI(height: number, blockHash: string, operationHash: Uint8Array): Promise<void> {
    if (!this.nodeConfig.proofOfIndex) {
      return;
    }
    if (isNullMerkelRoot(operationHash)) {
      return;
    }
    const poiBlock = PoiBlock.create(height, blockHash, operationHash, this.project.id);
    // This is the first creation of POI
    this.poi.bulkUpsert([poiBlock]);
    this.storeCacheService.metadata.setBulk([{key: 'lastCreatedPoiHeight', value: height}]);
    this.eventEmitter.emit(PoiEvent.PoiTarget, {
      height,
      timestamp: Date.now(),
    });

    await this.poiService.ensureGenesisPoi(height);
  }

  @mainThreadOnly()
  private updateStoreMetadata(height: number, updateProcessed = true): void {
    const meta = this.storeCacheService.metadata;
    // Update store metadata
    meta.setBulk([
      {key: 'lastProcessedHeight', value: height},
      {key: 'lastProcessedTimestamp', value: Date.now()},
    ]);
    // Db Metadata increase BlockCount, in memory ref to block-dispatcher _processedBlockCount
    if (updateProcessed) {
      meta.setIncrement('processedBlockCount');
    }
  }

  private get poi(): CachePoiModel {
    const poi = this.storeCacheService.poi;
    if (!poi) {
      throw new Error('Poi service expected poi repo but it was not found');
    }
    return poi;
  }
}
