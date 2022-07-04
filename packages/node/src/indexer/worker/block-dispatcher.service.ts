// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import os from 'os';
import path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { SubstrateBlock } from '@subql/types';
import { EventEmitter2 } from 'eventemitter2';
import { last } from 'lodash';
import { NodeConfig } from '../../configure/NodeConfig';
import { AutoQueue, Queue } from '../../utils/autoQueue';
import { getLogger } from '../../utils/logger';
import { fetchBlocksBatches } from '../../utils/substrate';
import { ApiService } from '../api.service';
import { IndexerEvent } from '../events';
import { IndexerManager } from '../indexer.manager';
import {
  FetchBlock,
  ProcessBlock,
  InitWorker,
  NumFetchedBlocks,
  NumFetchingBlocks,
  SetCurrentRuntimeVersion,
} from './worker';
import { Worker } from './worker.builder';

type IIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
  setCurrentRuntimeVersion: SetCurrentRuntimeVersion;
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
    ],
  );

  await indexerWorker.initWorker();

  return indexerWorker;
}

type GetRuntimeVersion = (block: SubstrateBlock) => Promise<RuntimeVersion>;

function getMaxWorkers(numWorkers?: number): number {
  const maxCPUs = os.cpus().length - 1;
  return Math.min(numWorkers ?? maxCPUs, maxCPUs);
}

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

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    private eventEmitter: EventEmitter2,
  ) {
    this.fetchQueue = new Queue(nodeConfig.batchSize * 3);
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async init(
    runtimeVersionGetter: GetRuntimeVersion,
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    this.getRuntimeVersion = runtimeVersionGetter;
    this.onDynamicDsCreated = onDynamicDsCreated;
  }

  onApplicationShutdown(): void {
    logger.info('onApplicationShutdown');
    this.isShutdown = true;
    this.processQueue.abort();
  }

  enqueueBlocks(heights: number[]): void {
    if (!heights.length) return;

    logger.info(`Enqueing blocks ${heights[0]}...${last(heights)}`);

    this.fetchQueue.putMany(heights);
    this.latestBufferedHeight = last(heights);

    void this.fetchBlocksFromQueue().catch((e) => {
      logger.error(e, 'Failed to fetch blocks from queue');
      throw e;
    });
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.fetchQueue.flush(); // Empty
    this.processQueue.flush();
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
    // Process queue is full, no point in fetching more blocks
    // if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    while (!this.isShutdown) {
      const blockNums = this.fetchQueue.takeMany(this.nodeConfig.batchSize);

      // Used to compare before and after as a way to check if queue was flushed
      const bufferedHeight = this._latestBufferedHeight;

      // Queue is empty
      if (!blockNums.length) {
        break;
      }

      logger.info(
        `fetch block [${blockNums[0]},${
          blockNums[blockNums.length - 1]
        }], total ${blockNums.length} blocks`,
      );

      const blocks = await fetchBlocksBatches(
        this.apiService.getApi(),
        blockNums,
      );

      if (bufferedHeight > this._latestBufferedHeight) {
        logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
        continue;
      }

      const blockTasks = blocks.map((block) => async () => {
        const height = block.block.block.header.number.toNumber();
        this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
          height,
          timestamp: Date.now(),
        });

        const runtimeVersion = await this.getRuntimeVersion(block.block);

        const { dynamicDsCreated } = await this.indexerManager.indexBlock(
          block,
          runtimeVersion,
        );

        if (dynamicDsCreated) {
          await this.onDynamicDsCreated(height);
        }
      });

      // There can be enough of a delay after fetching blocks that shutdown could now be true
      if (this.isShutdown) break;

      await Promise.all(this.processQueue.putMany(blockTasks));
    }

    this.fetching = false;
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

  /**
   * @param numWorkers. The number of worker threads to run, this is capped at number of cpus
   * @param workerQueueSize. The number of fetched blocks queued to be processed
   */
  constructor(
    numWorkers: number,
    workerQueueSize: number,
    private eventEmitter: EventEmitter2,
  ) {
    this.numWorkers = getMaxWorkers(numWorkers);
    this.queue = new AutoQueue(this.numWorkers * workerQueueSize);
  }

  async init(
    runtimeVersionGetter: GetRuntimeVersion,
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    this.workers = await Promise.all(
      new Array(this.numWorkers).fill(0).map(() => createIndexerWorker()),
    );

    this.getRuntimeVersion = runtimeVersionGetter;
    this.onDynamicDsCreated = onDynamicDsCreated;
  }

  async onApplicationShutdown(): Promise<void> {
    this.isShutdown = true;
    // Stop processing blocks
    this.queue.abort();

    // Stop all workers
    await Promise.all(this.workers.map((w) => w.terminate()));
  }

  enqueueBlocks(heights: number[]): void {
    if (!heights.length) return;
    logger.info(`Enqueing blocks ${heights[0]}...${last(heights)}`);

    heights.map((height) => this.enqueueBlock(height));

    this.latestBufferedHeight = last(heights);
  }

  flushQueue(height: number): void {
    this.latestBufferedHeight = height;
    this.queue.flush();
  }

  private enqueueBlock(height: number) {
    if (this.isShutdown) return;
    const workerIdx = this.getNextWorkerIndex();
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this._latestBufferedHeight;
    const pendingBlock = worker.fetchBlock(height);

    const processBlock = async () => {
      const start = new Date();
      const result = await pendingBlock;
      const end = new Date();

      if (bufferedHeight > this._latestBufferedHeight) {
        logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
        return;
      }

      if (start.getTime() < end.getTime() - 100) {
        console.log(
          'Waiting for pending block',
          end.getTime() - start.getTime(),
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

      // console.time(`Process block ${height}`);

      this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
        height,
        timestamp: Date.now(),
      });

      const { dynamicDsCreated } = await worker.processBlock(height);

      if (dynamicDsCreated) {
        await this.onDynamicDsCreated(height);
      }
      // console.timeEnd(`Process block ${height}`);
    };

    void this.queue.put(processBlock);
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
    this._latestBufferedHeight = height;
  }

  private getNextWorkerIndex(): number {
    const index = this.taskCounter % this.numWorkers;

    this.taskCounter++;

    return index;
  }
}
