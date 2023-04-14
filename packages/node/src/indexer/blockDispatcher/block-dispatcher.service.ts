// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getHeapStatistics } from 'v8';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getLogger,
  NodeConfig,
  IndexerEvent,
  delay,
  AutoQueue,
  Queue,
  waitForBatchSize,
  memoryLock,
  SmartBatchService,
} from '@subql/node-core';
import { last } from 'lodash';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { ProjectService } from '../project.service';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent } from '../types';
import { BaseBlockDispatcher } from './base-block-dispatcher';

const logger = getLogger('BlockDispatcherService');

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BaseBlockDispatcher<Queue<number>>
  implements OnApplicationShutdown
{
  private processQueue: AutoQueue<void>;

  private fetching = false;
  private isShutdown = false;
  // private getRuntimeVersion: GetRuntimeVersion;

  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    projectService: ProjectService,
    smartBatchService: SmartBatchService,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      new Queue(nodeConfig.batchSize * 3),
      smartBatchService,
    );
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    this.onDynamicDsCreated = onDynamicDsCreated;
    const blockAmount = await this.projectService.getProcessedBlockCount();
    this.setProcessedBlockCount(blockAmount ?? 0);
    this.runtimeService = runtimeService;
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
    this.processQueue.abort();
  }

  enqueueBlocks(cleanedBlocks: number[], latestBufferHeight?: number): void {
    // // In the case where factors of batchSize is equal to bypassBlock or when cleanedBatchBlocks is []
    // // to ensure block is bypassed, latestBufferHeight needs to be manually set
    // If cleanedBlocks = []
    if (!!latestBufferHeight && !cleanedBlocks.length) {
      this.latestBufferedHeight = latestBufferHeight;
      return;
    }

    logger.info(
      `Enqueueing blocks ${cleanedBlocks[0]}...${last(cleanedBlocks)}, total ${
        cleanedBlocks.length
      } blocks`,
    );

    this.queue.putMany(cleanedBlocks);

    this.latestBufferedHeight = latestBufferHeight ?? last(cleanedBlocks);
    void this.fetchBlocksFromQueue().catch((e) => {
      logger.error(e, 'Failed to fetch blocks from queue');
      if (!this.isShutdown) {
        process.exit(1);
      }
    });
  }

  flushQueue(height: number): void {
    super.flushQueue(height);
    this.processQueue.flush();
  }

  private memoryleft(): number {
    return (
      this.smartBatchService.heapMemoryLimit() -
      getHeapStatistics().used_heap_size
    );
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
    // Process queue is full, no point in fetching more blocks
    // if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    try {
      while (!this.isShutdown) {
        const blockNums = this.queue.takeMany(
          Math.min(this.processQueue.freeSpace, this.smartBatchSize),
        );
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
          `fetch block [${blockNums[0]},${
            blockNums[blockNums.length - 1]
          }], total ${blockNums.length} blocks`,
        );

        const specChanged = await this.runtimeService.specChanged(
          blockNums[blockNums.length - 1],
        );

        // If specVersion not changed, a known overallSpecVer will be pass in
        // Otherwise use api to fetch runtimes

        if (memoryLock.isLocked) {
          await memoryLock.waitForUnlock();
        }

        const blocks = await this.apiService.fetchBlocks(
          blockNums,
          specChanged ? undefined : this.runtimeService.parentSpecVersion,
        );

        this.smartBatchService.addToSizeBuffer(blocks);

        // Check if the queues have been flushed between queue.takeMany and fetchBlocksBatches resolving
        // Peeking the queue is because the latestBufferedHeight could have regrown since fetching block
        if (
          bufferedHeight > this._latestBufferedHeight ||
          this.queue.peek() < Math.min(...blockNums)
        ) {
          logger.info(`${this.queue.peek()} - ${Math.min(...blockNums)}`);
          logger.info(`Queue was reset for new DS, discarding fetched blocks`);
          continue;
        }

        const blockTasks = blocks.map((block) => async () => {
          const height = block.block.block.header.number.toNumber();
          try {
            const runtimeVersion = await this.runtimeService.getRuntimeVersion(
              block.block,
            );

            this.preProcessBlock(height);
            // Inject runtimeVersion here to enhance api.at preparation
            const processBlockResponse = await this.indexerManager.indexBlock(
              block,
              runtimeVersion,
              this.projectService.dataSources,
            );

            await this.postProcessBlock(height, processBlockResponse);

            //set block to null for garbage collection
            block = null;
          } catch (e) {
            if (this.isShutdown) {
              return;
            }
            logger.error(
              e,
              `failed to index block at height ${height} ${
                e.handler ? `${e.handler}(${e.stack ?? ''})` : ''
              }`,
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
    } finally {
      this.fetching = false;
    }
  }
}
