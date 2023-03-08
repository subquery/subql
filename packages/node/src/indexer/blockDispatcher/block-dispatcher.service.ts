// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  getLogger,
  NodeConfig,
  IndexerEvent,
  delay,
  profilerWrap,
  AutoQueue,
  Queue,
  splitArrayByRatio,
} from '@subql/node-core';
import { last } from 'lodash';
import * as SubstrateUtil from '../../utils/substrate';
import { ApiLoadBalancer, ApiService } from '../api.service';
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
  private fetchBlocksBatches = SubstrateUtil.fetchBlocksBatches;
  private loadBalancer: ApiLoadBalancer;

  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    projectService: ProjectService,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      new Queue(nodeConfig.batchSize * 3),
    );
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3);

    if (this.nodeConfig.profiler) {
      this.fetchBlocksBatches = profilerWrap(
        SubstrateUtil.fetchBlocksBatches,
        'SubstrateUtil',
        'fetchBlocksBatches',
      );
    }
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
    this.loadBalancer = new ApiLoadBalancer(
      this.apiService.numConnections,
      this.nodeConfig.batchSize,
    );
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

  private async fetchBlocksFromFirstAvailableEndpoint(
    batch: number[],
    specChanged?: boolean,
  ): Promise<BlockContent[]> {
    try {
      const start = Date.now();
      const index = this.apiService.getFirstConnectedApiIndex();
      if (index === -1) {
        throw new Error('No connected api');
      }
      const blocks = await this.fetchBlocksBatches(
        this.apiService.getApi(index),
        batch,
        specChanged ? undefined : this.runtimeService.parentSpecVersion,
      );
      const end = Date.now();
      this.loadBalancer.addToBuffer(index, (end - start) / batch.length);
      return blocks;
    } catch (e) {
      logger.error(e, 'Failed to fetch blocks');
      this.apiService.attemptReconnects();
      return this.fetchBlocksFromFirstAvailableEndpoint(batch, specChanged);
    }
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
    // Process queue is full, no point in fetching more blocks
    // if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    try {
      while (!this.isShutdown) {
        const blockNums = this.queue.takeMany(
          Math.min(this.nodeConfig.batchSize, this.processQueue.freeSpace),
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

        logger.info(
          `fetch block [${blockNums[0]},${
            blockNums[blockNums.length - 1]
          }], total ${blockNums.length} blocks`,
        );

        const specChanged = await this.runtimeService.specChanged(
          blockNums[blockNums.length - 1],
        );

        //await this.apiService.addToDisconnectedApiIndices(0);
        const weights = this.loadBalancer.getWeights(
          this.apiService.disconnectApis,
        );
        logger.info(`weights: ${weights}`);
        const blocks: BlockContent[] = [];

        //split the blockNums into batches based on the weight as ratio of length of blockNums
        //for example, if blocknums = [1,2,3,4,5,6,7,8,9,10] and weights = [0.5, 0.5], then the batches will be [[1,2,3,4,5], [6,7,8,9,10]]
        const batches = splitArrayByRatio(blockNums, weights);

        const fetchBlocksBatches = async (batches: number[][]) => {
          //fetch blocks from each batch in parallel and record the time it takes to fetch each batch
          //if fetching fails for a batch, add the batch to the end of the queue and try again

          const promises = batches.map(async (batch, index) => {
            try {
              const start = Date.now();
              const blocks = await this.fetchBlocksBatches(
                this.apiService.getApi(index),
                batch,
                specChanged ? undefined : this.runtimeService.parentSpecVersion,
              );
              const end = Date.now();
              this.loadBalancer.addToBuffer(
                index,
                Math.ceil((end - start) / batch.length),
              );
              return blocks;
            } catch (e) {
              logger.error(
                e,
                `Failed to fetch blocks ${batch[0]}...${
                  batch[batch.length - 1]
                }`,
              );
              await this.apiService.addToDisconnectedApiIndices(index);
              if (index === batches.length - 1) {
                //if it is the last batch, fetch batch from the first available endpoint
                const blocks = await this.fetchBlocksFromFirstAvailableEndpoint(
                  batch,
                  specChanged,
                );
                return blocks;
              } else {
                //if it is not the last batch, add the batch to the next batch
                batches[index + 1].push(...batch);
              }

              return [];
            }
          });

          const results = await Promise.all(promises);
          results.forEach((result) => {
            blocks.push(...result);
          });
        };

        await fetchBlocksBatches(batches);
        //logger.info(JSON.stringify(blocks))

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
            );

            await this.postProcessBlock(height, processBlockResponse);
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
