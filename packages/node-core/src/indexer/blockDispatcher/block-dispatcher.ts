// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {getHeapStatistics} from 'v8';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {last} from 'lodash';
import {NodeConfig} from '../../configure';
import {IProjectUpgradeService} from '../../configure/ProjectUpgrade.service';
import {IndexerEvent} from '../../events';
import {PoiSyncService} from '../../indexer';
import {getLogger} from '../../logger';
import {profilerWrap} from '../../profiler';
import {Queue, AutoQueue, delay, memoryLock, waitForBatchSize, isTaskFlushedError} from '../../utils';
import {DynamicDsService} from '../dynamic-ds.service';
import {PoiService} from '../poi/poi.service';
import {SmartBatchService} from '../smartBatch.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IProjectService, ISubqueryProject} from '../types';
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
  private fetchQueue: AutoQueue<B>;
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
    projectUpgradeService: IProjectUpgradeService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    poiSyncService: PoiSyncService,
    project: ISubqueryProject,
    dynamicDsService: DynamicDsService<DS>,
    fetchBlocksBatches: BatchBlockFetcher<B>
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      projectUpgradeService,
      new Queue(nodeConfig.batchSize * 3),
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      poiSyncService,
      dynamicDsService
    );
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3, 1, nodeConfig.timeout, 'Process');
    this.fetchQueue = new AutoQueue(nodeConfig.batchSize * 3, nodeConfig.batchSize, nodeConfig.timeout, 'Fetch');

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

  enqueueBlocks(heights: number[], latestBufferHeight?: number): void {
    // In the case where factors of batchSize is equal to bypassBlock or when heights is []
    // to ensure block is bypassed, we set the latestBufferHeight to the heights
    // make sure lastProcessedHeight in metadata is updated
    if (!!latestBufferHeight && !heights.length) {
      heights = [latestBufferHeight];
    }
    logger.info(`Enqueueing blocks ${heights[0]}...${last(heights)}, total ${heights.length} blocks`);

    // Those blocks will still be filtered in the handler
    this.queue.putMany(heights);

    this.latestBufferedHeight = latestBufferHeight ?? last(heights) ?? this.latestBufferedHeight;
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

        const blockNum = this.queue.take();

        // This shouldn't happen but if it does it whould get caught above
        if (!blockNum) {
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
            const [block] = await this.fetchBlocksBatches([blockNum]);

            this.smartBatchService.addToSizeBuffer([block]);
            return block;
          })
          .then(
            (block) => {
              const height = this.getBlockHeight(block);

              return this.processQueue.put(async () => {
                // Check if the queues have been flushed between queue.takeMany and fetchBlocksBatches resolving
                // Peeking the queue is because the latestBufferedHeight could have regrown since fetching block
                const peeked = this.queue.peek();
                if (bufferedHeight > this._latestBufferedHeight || (peeked && peeked < blockNum)) {
                  logger.info(`Queue was reset for new DS, discarding fetched blocks`);
                  return;
                }

                try {
                  await this.preProcessBlock(height);
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
                    `Failed to index block at height ${height} ${e.handler ? `${e.handler}(${e.stack ?? ''})` : ''}`
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
              logger.error(e, `Failed to fetch block ${blockNum}.`);
              throw e;
            }
          )
          .catch((e) => {
            logger.warn(e, 'Failed to enqueue fetched block to process');
            process.exit(1);
          });

        this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
          value: this.processQueue.size,
        });
      }
    } catch (e: any) {
      logger.error(e, 'Failed to process blocks from queue');
      if (!this.isShutdown) {
        process.exit(1);
      }
    } finally {
      this.fetching = false;
    }
  }
}
