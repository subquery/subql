// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getHeapStatistics} from 'v8';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {last} from 'lodash';
import {NodeConfig} from '../../configure';
import {IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {profilerWrap} from '../../profiler';
import {Queue, AutoQueue, delay, memoryLock, waitForBatchSize} from '../../utils';
import {DynamicDsService} from '../dynamic-ds.service';
import {PoiService} from '../poi/poi.service';
import {SmartBatchService} from '../smartBatch.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IProjectNetworkConfig, IProjectService, ISubqueryProject} from '../types';
import {BaseBlockDispatcher, ProcessBlockResponse} from './base-block-dispatcher';

const logger = getLogger('BlockDispatcherService');

type BatchBlockFetcher<B> = (heights: number[]) => Promise<B[]>;

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
export abstract class BlockDispatcher<B, DS>
  extends BaseBlockDispatcher<Queue<number>, DS>
  implements OnApplicationShutdown
{
  private processQueue: AutoQueue<void>;

  private fetchBlocksBatches: BatchBlockFetcher<B>;

  private fetching = false;
  private isShutdown = false;

  protected abstract indexBlock(block: B): Promise<ProcessBlockResponse>;
  protected abstract getBlockHeight(block: B): number;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: IProjectService<DS>,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    project: ISubqueryProject<IProjectNetworkConfig>,
    dynamicDsService: DynamicDsService<DS>,
    fetchBlocksBatches: BatchBlockFetcher<B>
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      new Queue(nodeConfig.batchSize * 3),
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      dynamicDsService
    );
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3);

    if (this.nodeConfig.profiler) {
      this.fetchBlocksBatches = profilerWrap(fetchBlocksBatches, 'BlockDispatcher', 'fetchBlocksBatches');
    } else {
      this.fetchBlocksBatches = fetchBlocksBatches;
    }
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
    this.processQueue.abort();
  }

  async enqueueBlocks(heights: number[], latestBufferHeight?: number): Promise<void> {
    // In the case where factors of batchSize is equal to bypassBlock or when heights is []
    // to ensure block is bypassed, latestBufferHeight needs to be manually set
    if (!!latestBufferHeight && !heights.length) {
      await this.jumpBufferedHeight(latestBufferHeight);
      return;
    }

    logger.info(`Enqueueing blocks ${heights[0]}...${last(heights)}, total ${heights.length} blocks`);

    this.queue.putMany(heights);

    this.latestBufferedHeight = latestBufferHeight ?? last(heights) ?? this.latestBufferedHeight;
    void this.fetchBlocksFromQueue();
  }

  flushQueue(height: number): void {
    super.flushQueue(height);
    this.processQueue.flush();
  }

  private memoryleft(): number {
    return this.smartBatchService.heapMemoryLimit() - getHeapStatistics().used_heap_size;
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
    // Process queue is full, no point in fetching more blocks
    // if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    try {
      while (!this.isShutdown) {
        const blockNums = this.queue.takeMany(Math.min(this.nodeConfig.batchSize, this.processQueue.freeSpace!));
        // Used to compare before and after as a way to check if queue was flushed
        const bufferedHeight = this._latestBufferedHeight;

        // Queue is empty
        if (!blockNums.length) {
          // The process queue might be full so no block nums were taken, wait and try again
          if (this.queue.size) {
            await delay(1);
            continue;
          }
          break;
        }

        if (this.memoryleft() < 0) {
          //stop fetching until memory is freed
          await waitForBatchSize(this.minimumHeapLimit);
          continue;
        }

        logger.info(
          `fetch block [${blockNums[0]},${blockNums[blockNums.length - 1]}], total ${blockNums.length} blocks`
        );

        // If specVersion not changed, a known overallSpecVer will be pass in
        // Otherwise use api to fetch runtimes

        if (memoryLock.isLocked()) {
          await memoryLock.waitForUnlock();
        }

        const blocks = await this.fetchBlocksBatches(blockNums);

        this.smartBatchService.addToSizeBuffer(blocks);

        // Check if the queues have been flushed between queue.takeMany and fetchBlocksBatches resolving
        // Peeking the queue is because the latestBufferedHeight could have regrown since fetching block
        const peeked = this.queue.peek();
        if (bufferedHeight > this._latestBufferedHeight || (peeked && peeked < Math.min(...blockNums))) {
          logger.info(`Queue was reset for new DS, discarding fetched blocks`);
          continue;
        }

        const blockTasks = blocks.map((block) => async () => {
          const height = this.getBlockHeight(block);
          try {
            this.preProcessBlock(height);
            // Inject runtimeVersion here to enhance api.at preparation
            const processBlockResponse = await this.indexBlock(block);

            await this.postProcessBlock(height, processBlockResponse);

            //set block to null for garbage collection
            (block as any) = null;
          } catch (e: any) {
            // TODO discard any cache changes from this block height
            if (this.isShutdown) {
              return;
            }
            logger.error(
              e,
              `failed to index block at height ${height} ${e.handler ? `${e.handler}(${e.stack ?? ''})` : ''}`
            );
            throw e;
          }
        });

        // There can be enough of a delay after fetching blocks that shutdown could now be true
        if (this.isShutdown) break;

        this.processQueue.putMany(blockTasks);

        this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
          value: this.processQueue.size,
        });
      }
    } catch (e: any) {
      logger.error(e, 'Failed to fetch blocks from queue');
      if (!this.isShutdown) {
        process.exit(1);
      }
    } finally {
      this.fetching = false;
    }
  }
}
