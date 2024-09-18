// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getHeapStatistics} from 'v8';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {BaseDataSource} from '@subql/types-core';
import {IBlockchainService} from '../../blockchain.service';
import {NodeConfig} from '../../configure';
import {IProjectUpgradeService} from '../../configure/ProjectUpgrade.service';
import {IndexerEvent} from '../../events';
import {getBlockHeight, IBlock, PoiSyncService} from '../../indexer';
import {getLogger} from '../../logger';
import {exitWithError, monitorWrite} from '../../process';
import {profilerWrap} from '../../profiler';
import {Queue, AutoQueue, delay, memoryLock, waitForBatchSize, isTaskFlushedError} from '../../utils';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IIndexerManager, IProjectService, ISubqueryProject} from '../types';
import {BaseBlockDispatcher} from './base-block-dispatcher';

const logger = getLogger('BlockDispatcherService');

type BatchBlockFetcher<B> = (heights: number[]) => Promise<IBlock<B>[]>;

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
export class BlockDispatcher<B, DS extends BaseDataSource>
  extends BaseBlockDispatcher<Queue<IBlock<B> | number>, DS, B>
  implements OnApplicationShutdown
{
  private fetchQueue: AutoQueue<IBlock<B>>;
  private processQueue: AutoQueue<void>;

  private fetchBlocksBatches: BatchBlockFetcher<B>;

  private fetching = false;
  private isShutdown = false;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: IProjectService<DS>,
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    project: ISubqueryProject,
    blockchainService: IBlockchainService<DS>,
    private indexerManager: IIndexerManager<B, DS>
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      projectUpgradeService,
      new Queue(nodeConfig.batchSize * 3),
      storeService,
      storeCacheService,
      poiSyncService
    );
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3, 1, nodeConfig.timeout, 'Process');
    this.fetchQueue = new AutoQueue(nodeConfig.batchSize * 3, nodeConfig.batchSize, nodeConfig.timeout, 'Fetch');
    if (this.nodeConfig.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        blockchainService.fetchBlocks.bind(blockchainService),
        'BlockDispatcher',
        'fetchBlocksBatches'
      );
    } else {
      this.fetchBlocksBatches = blockchainService.fetchBlocks.bind(blockchainService);
    }
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
    this.processQueue.abort();
  }

  enqueueBlocks(heights: (IBlock<B> | number)[], latestBufferHeight: number): void {
    // In the case where factors of batchSize is equal to bypassBlock or when heights is []
    // to ensure block is bypassed, we set the latestBufferHeight to the heights
    // make sure lastProcessedHeight in metadata is updated
    if (!heights.length) {
      heights = [latestBufferHeight];
    }
    const startBlockHeight = getBlockHeight(heights[0]);
    const endBlockHeight = getBlockHeight(heights[heights.length - 1]);
    logger.info(`Enqueueing blocks ${startBlockHeight}...${endBlockHeight}, total ${heights.length} blocks`);
    this.queue.putMany(heights);
    this.latestBufferedHeight = latestBufferHeight;
    void this.fetchBlocksFromQueue();
  }

  flushQueue(height: number): void {
    super.flushQueue(height);
    this.fetchQueue.flush();
    this.processQueue.flush();
  }

  private memoryleft(): number {
    return this.smartBatchService.heapMemoryLimit() - getHeapStatistics().used_heap_size;
  }

  @Interval(10000)
  queueStats(stat: 'size' | 'freeSpace' = 'freeSpace'): void {
    // NOTE: If the free space of the process queue is low it means that processing is the limiting factor. If it is large then fetching blocks is the limitng factor.
    logger.debug(
      `QUEUE INFO ${stat}: Block numbers: ${this.queue[stat]}, fetch: ${this.fetchQueue[stat]}, process: ${this.processQueue[stat]}`
    );
  }
  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;

    this.fetching = true;

    try {
      while (!this.isShutdown) {
        // Wait for blocks or capacity in queues. There needs to be a check that the output of the fetch queue has capacity to go to the process queue
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (!this.queue.size || !this.fetchQueue.freeSpace! || this.fetchQueue.size >= this.processQueue.freeSpace!) {
          await delay(1);
          continue;
        }
        const blockOrNum = this.queue.take();
        // This shouldn't happen but if it does it whould get caught above
        if (!blockOrNum) {
          continue;
        }

        // Used to compare before and after as a way to check if queue was flushed
        const bufferedHeight = this._latestBufferedHeight;

        if (this.memoryleft() < 0) {
          //stop fetching until memory is freed
          await waitForBatchSize(this.minimumHeapLimit);
        }

        void this.fetchQueue
          .put(async () => {
            if (memoryLock.isLocked()) {
              await memoryLock.waitForUnlock();
            }
            if (typeof blockOrNum !== 'number') {
              // Type is of block
              return blockOrNum;
            }
            const [block] = await this.fetchBlocksBatches([blockOrNum]);
            this.smartBatchService.addToSizeBuffer([block]);
            return block;
          })
          .then(
            (block) => {
              const {blockHeight} = block.getHeader();

              return this.processQueue.put(async () => {
                // Check if the queues have been flushed between queue.takeMany and fetchBlocksBatches resolving
                // Peeking the queue is because the latestBufferedHeight could have regrown since fetching block
                const peeked = this.queue.peek();
                if (bufferedHeight > this._latestBufferedHeight || (peeked && getBlockHeight(peeked) < blockHeight)) {
                  logger.info(`Queue was reset for new DS, discarding fetched blocks`);
                  return;
                }

                try {
                  await this.preProcessBlock(blockHeight);
                  monitorWrite(`Processing from main thread`);
                  // Inject runtimeVersion here to enhance api.at preparation
                  const processBlockResponse = await this.indexerManager.indexBlock(
                    block,
                    await this.projectService.getDataSources(block.getHeader().blockHeight)
                  );
                  await this.postProcessBlock(blockHeight, processBlockResponse);
                  //set block to null for garbage collection
                  (block as any) = null;
                } catch (e: any) {
                  // TODO discard any cache changes from this block height
                  if (this.isShutdown) {
                    return;
                  }
                  logger.error(
                    e,
                    `Failed to index block at height ${blockHeight} ${
                      e.handler ? `${e.handler}(${e.stack ?? ''})` : ''
                    }`
                  );
                  throw e;
                }
              });
            },
            (e) => {
              if (isTaskFlushedError(e)) {
                // Do nothing, fetching the block was flushed, this could be caused by forked blocks or dynamic datasources
                return;
              }
              logger.error(e, `Failed to fetch block ${getBlockHeight(blockOrNum)}.`);
              throw e;
            }
          )
          .catch((e) => {
            if (isTaskFlushedError(e)) {
              // Do nothing, fetching the block was flushed, this could be caused by forked blocks or dynamic datasources
              return;
            }
            exitWithError(new Error(`Failed to enqueue fetched block to process`, {cause: e}), logger);
          });

        this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
          value: this.processQueue.size,
        });
      }
    } catch (e: any) {
      if (!this.isShutdown) {
        exitWithError(new Error(`Failed to process blocks from queue`, {cause: e}), logger);
      }
    } finally {
      this.fetching = false;
    }
  }
}
