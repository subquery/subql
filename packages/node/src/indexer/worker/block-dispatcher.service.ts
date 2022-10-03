// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
  getLogger,
  NodeConfig,
  IndexerEvent,
  Worker,
  delay,
  profilerWrap,
  AutoQueue,
  Queue,
} from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import chalk from 'chalk';
import { last } from 'lodash';
import * as SubstrateUtil from '../../utils/substrate';
import { yargsOptions } from '../../yargs';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { ProjectService } from '../project.service';
import {
  FetchBlock,
  ProcessBlock,
  InitWorker,
  NumFetchedBlocks,
  NumFetchingBlocks,
  SetCurrentRuntimeVersion,
  GetWorkerStatus,
} from './worker';

const NULL_MERKEL_ROOT = hexToU8a('0x00');
const { argv } = yargsOptions;

function isNullMerkelRoot(operationHash: Uint8Array): boolean {
  return u8aEq(operationHash, NULL_MERKEL_ROOT);
}

type IIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
  setCurrentRuntimeVersion: SetCurrentRuntimeVersion;
  getStatus: GetWorkerStatus;
};

type IInitIndexerWorker = IIndexerWorker & {
  initWorker: InitWorker;
};

type IndexerWorker = IIndexerWorker & {
  terminate: () => Promise<number>;
};

async function createIndexerWorker(): Promise<IndexerWorker> {
  const indexerWorker = Worker.create<IInitIndexerWorker>(
    path.resolve(__dirname, '../../../dist/indexer/worker/worker.js'),
    [
      'initWorker',
      'processBlock',
      'fetchBlock',
      'numFetchedBlocks',
      'numFetchingBlocks',
      'setCurrentRuntimeVersion',
      'getStatus',
    ],
  );

  await indexerWorker.initWorker();

  return indexerWorker;
}

type GetRuntimeVersion = (block: SubstrateBlock) => Promise<RuntimeVersion>;

export interface IBlockDispatcher {
  init(
    runtimeVersionGetter: GetRuntimeVersion,
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void>;

  enqueueBlocks(heights: number[]): void;

  queueSize: number;
  freeSize: number;
  latestBufferedHeight: number | undefined;

  // Remove all enqueued blocks, used when a dynamic ds is created
  flushQueue(height: number): void;
  rewind(height: number): Promise<void>;
}

const logger = getLogger('BlockDispatcherService');

// TODO move to another file
/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  implements IBlockDispatcher, OnApplicationShutdown
{
  private fetchQueue: Queue<number>;
  private processQueue: AutoQueue<void>;

  private fetching = false;
  private isShutdown = false;
  private getRuntimeVersion: GetRuntimeVersion;
  private onDynamicDsCreated: (height: number) => Promise<void>;
  private _latestBufferedHeight: number;
  private _processedBlockCount: number;

  private fetchBlocksBatches = SubstrateUtil.fetchBlocksBatches;
  private latestProcessedHeight: number;
  private currentProcessingHeight: number;

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    private eventEmitter: EventEmitter2,
    private projectService: ProjectService,
  ) {
    this.fetchQueue = new Queue(nodeConfig.batchSize * 3);
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
    runtimeVersionGetter: GetRuntimeVersion,
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    this.getRuntimeVersion = runtimeVersionGetter;
    this.onDynamicDsCreated = onDynamicDsCreated;
    const blockAmount = await this.projectService.getProcessedBlockCount();
    this.setProcessedBlockCount(blockAmount ?? 0);
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
    this.processQueue.abort();
  }

  enqueueBlocks(heights: number[]): void {
    if (!heights.length) return;

    logger.info(
      `Enqueing blocks ${heights[0]}...${last(heights)}, total ${
        heights.length
      } blocks`,
    );

    this.fetchQueue.putMany(heights);
    this.latestBufferedHeight = last(heights);

    void this.fetchBlocksFromQueue().catch((e) => {
      logger.error(e, 'Failed to fetch blocks from queue');
      if (!this.isShutdown) {
        process.exit(1);
      }
    });
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.fetchQueue.flush(); // Empty
    this.processQueue.flush();
  }
  //  Compare it with current indexing number, if last corrected is already indexed
  //  rewind, also flush queued blocks, drop current indexing transaction, set last processed to correct block too
  //  if rollback is greater than current index flush queue only
  async rewind(lastCorrectHeight: number): Promise<void> {
    if (lastCorrectHeight <= this.currentProcessingHeight) {
      logger.info(
        `Found last verified block at height ${lastCorrectHeight}, rewinding...`,
      );
      await this.projectService.reindex(lastCorrectHeight);
      this.latestProcessedHeight = lastCorrectHeight;
      logger.info(`Successful rewind to block ${lastCorrectHeight} !`);
    }
    this.flushQueue(lastCorrectHeight);
    logger.info(`Queued block flushed!`); //Also last buffered height reset, next fetching should start after lastCorrectHeight
  }

  private setProcessedBlockCount(processedBlockCount: number) {
    this._processedBlockCount = processedBlockCount;
    this.eventEmitter.emit(IndexerEvent.BlockProcessedCount, {
      processedBlockCount,
      timestamp: Date.now(),
    });
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
    // Process queue is full, no point in fetching more blocks
    // if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    try {
      while (!this.isShutdown) {
        const blockNums = this.fetchQueue.takeMany(
          Math.min(this.nodeConfig.batchSize, this.processQueue.freeSpace),
        );
        // Used to compare before and after as a way to check if queue was flushed
        const bufferedHeight = this._latestBufferedHeight;

        // Queue is empty
        if (!blockNums.length) {
          // The process queue might be full so no block nums were taken, wait and try again
          if (this.fetchQueue.size) {
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

        const blocks = await this.fetchBlocksBatches(
          this.apiService.getApi(),
          blockNums,
        );

        if (bufferedHeight > this._latestBufferedHeight) {
          logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
          continue;
        }
        const blockTasks = blocks.map((block) => async () => {
          const height = block.block.block.header.number.toNumber();
          this.currentProcessingHeight = height;
          try {
            this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
              height,
              timestamp: Date.now(),
            });

            const runtimeVersion = await this.getRuntimeVersion(block.block);
            const { dynamicDsCreated, operationHash, reindexBlockHeight } =
              await this.indexerManager.indexBlock(block, runtimeVersion);
            if (reindexBlockHeight !== null) {
              await this.rewind(reindexBlockHeight);
              this.latestProcessedHeight = reindexBlockHeight;
            } else {
              if (
                this.nodeConfig.proofOfIndex &&
                !isNullMerkelRoot(operationHash)
              ) {
                if (!this.projectService.blockOffset) {
                  // Which means during project init, it has not found offset and set value
                  await this.projectService.upsertMetadataBlockOffset(
                    height - 1,
                  );
                }
                void this.projectService.setBlockOffset(height - 1);
              }
              if (dynamicDsCreated) {
                await this.onDynamicDsCreated(height);
              }
              assert(
                !this.latestProcessedHeight ||
                  height > this.latestProcessedHeight,
                `Block processed out of order. Height: ${height}. Latest: ${this.latestProcessedHeight}`,
              );
              // In memory _processedBlockCount increase, db metadata increase BlockCount in indexer.manager
              this.setProcessedBlockCount(this._processedBlockCount + 1);
              this.latestProcessedHeight = height;
            }
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

  get queueSize(): number {
    return this.fetchQueue.size;
  }

  get freeSize(): number {
    return this.fetchQueue.freeSpace;
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
}

@Injectable()
export class WorkerBlockDispatcherService
  implements IBlockDispatcher, OnApplicationShutdown
{
  private workers: IndexerWorker[];
  private numWorkers: number;
  private getRuntimeVersion: GetRuntimeVersion;
  private onDynamicDsCreated: (height: number) => Promise<void>;

  private taskCounter = 0;
  private isShutdown = false;
  private queue: AutoQueue<void>;
  private _latestBufferedHeight: number;
  private _processedBlockCount: number;
  private currentProcessingHeight: number;
  private latestProcessedHeight: number;

  constructor(
    private nodeConfig: NodeConfig,
    private eventEmitter: EventEmitter2,
    private projectService: ProjectService,
  ) {
    this.numWorkers = nodeConfig.workers;
    this.queue = new AutoQueue(this.numWorkers * nodeConfig.batchSize * 2);
  }

  async init(
    runtimeVersionGetter: GetRuntimeVersion,
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    if (argv['best-block']) {
      throw new Error(
        'Sorry, best block feature is not support with workers yet.',
      );
    }

    this.workers = await Promise.all(
      new Array(this.numWorkers).fill(0).map(() => createIndexerWorker()),
    );

    this.getRuntimeVersion = runtimeVersionGetter;
    this.onDynamicDsCreated = onDynamicDsCreated;

    const blockAmount = await this.projectService.getProcessedBlockCount();
    this.setProcessedBlockCount(blockAmount ?? 0);
  }

  private setProcessedBlockCount(processedBlockCount: number) {
    this._processedBlockCount = processedBlockCount;
    this.eventEmitter.emit(IndexerEvent.BlockProcessedCount, {
      processedBlockCount,
      timestamp: Date.now(),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShutdown = true;
    // Stop processing blocks
    this.queue.abort();

    // Stop all workers
    if (this.workers) {
      await Promise.all(this.workers.map((w) => w.terminate()));
    }
  }

  enqueueBlocks(heights: number[]): void {
    if (!heights.length) return;
    logger.info(
      `Enqueing blocks [${heights[0]}...${last(heights)}], total ${
        heights.length
      } blocks`,
    );

    // eslint-disable-next-line no-constant-condition
    if (true) {
      /*
       * Load balancing:
       * worker1: 1,2,3
       * worker2: 4,5,6
       */
      const workerIdx = this.getNextWorkerIndex();
      heights.map((height) => this.enqueueBlock(height, workerIdx));
    } else {
      /*
       * Load balancing:
       * worker1: 1,3,5
       * worker2: 2,4,6
       */
      heights.map((height) =>
        this.enqueueBlock(height, this.getNextWorkerIndex()),
      );
    }

    this.latestBufferedHeight = last(heights);
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.queue.flush();
  }

  private enqueueBlock(height: number, workerIdx: number) {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this._latestBufferedHeight;
    const pendingBlock = worker.fetchBlock(height);

    const processBlock = async () => {
      try {
        const start = new Date();
        const result = await pendingBlock;
        const end = new Date();

        if (bufferedHeight > this._latestBufferedHeight) {
          logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
          return;
        }

        const waitTime = end.getTime() - start.getTime();
        if (waitTime > 1000) {
          logger.info(
            `Waiting to fetch block ${height}: ${chalk.red(`${waitTime}ms`)}`,
          );
        } else if (waitTime > 200) {
          logger.info(
            `Waiting to fetch block ${height}: ${chalk.yellow(
              `${waitTime}ms`,
            )}`,
          );
        }

        if (result) {
          const runtimeVersion = await this.getRuntimeVersion({
            specVersion: result.specVersion,
            block: {
              header: {
                parentHash: result.parentHash,
              },
            },
          } as any);

          await worker.setCurrentRuntimeVersion(runtimeVersion.toHex());
        }

        // logger.info(
        //   `worker ${workerIdx} processing block ${height}, fetched blocks: ${await worker.numFetchedBlocks()}, fetching blocks: ${await worker.numFetchingBlocks()}`,
        // );
        this.currentProcessingHeight = height;
        this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
          height,
          timestamp: Date.now(),
        });

        const { dynamicDsCreated, operationHash, reindexBlockHeight } =
          await worker.processBlock(height);
        if (reindexBlockHeight !== null) {
          await this.rewind(reindexBlockHeight);
          this.latestProcessedHeight = reindexBlockHeight;
        } else {
          // In memory _processedBlockCount increase, db metadata increase BlockCount in indexer.manager
          this.setProcessedBlockCount(this._processedBlockCount + 1);

          if (
            this.nodeConfig.proofOfIndex &&
            !isNullMerkelRoot(Buffer.from(operationHash, 'base64'))
          ) {
            if (!this.projectService.blockOffset) {
              // Which means during project init, it has not found offset and set value
              await this.projectService.upsertMetadataBlockOffset(height - 1);
            }
            void this.projectService.setBlockOffset(height - 1);
          }

          if (dynamicDsCreated) {
            await this.onDynamicDsCreated(height);
          }
        }
      } catch (e) {
        logger.error(
          e,
          `failed to index block at height ${height} ${
            e.handler ? `${e.handler}(${e.stack ?? ''})` : ''
          }`,
        );
        throw e;
      }
    };

    void this.queue.put(processBlock);
  }

  async rewind(lastCorrectHeight: number): Promise<void> {
    if (lastCorrectHeight <= this.currentProcessingHeight) {
      logger.info(
        `Found last verified block at height ${lastCorrectHeight}, rewinding...`,
      );
      await this.projectService.reindex(lastCorrectHeight);
      this.latestProcessedHeight = lastCorrectHeight;
      logger.info(`Successful rewind to block ${lastCorrectHeight} !`);
    }
    this.flushQueue(lastCorrectHeight);
    logger.info(`Queued block flushed!`); //Also last buffered height reset, next fetching should start after lastCorrectHeight
  }

  @Interval(15000)
  async sampleWorkerStatus(): Promise<void> {
    for (const worker of this.workers) {
      const status = await worker.getStatus();
      logger.info(JSON.stringify(status));
    }
  }

  get queueSize(): number {
    return this.queue.size;
  }

  get freeSize(): number {
    return this.queue.freeSpace;
  }

  get latestBufferedHeight(): number {
    return this._latestBufferedHeight;
  }

  set latestBufferedHeight(height: number) {
    this.eventEmitter.emit(IndexerEvent.BlocknumberQueueSize, {
      value: this.queueSize,
    });

    // There is only a single queue with workers so we treat them as the same
    this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
      value: this.queueSize,
    });
    this._latestBufferedHeight = height;
  }

  private getNextWorkerIndex(): number {
    const index = this.taskCounter % this.numWorkers;

    this.taskCounter++;

    return index;
  }
}
