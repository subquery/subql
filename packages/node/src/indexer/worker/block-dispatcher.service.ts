// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import os from 'os';
import path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from 'eventemitter2';
import { NodeConfig } from '../../configure/NodeConfig';
import { AutoQueue, Queue } from '../../utils/autoQueue';
import { getLogger } from '../../utils/logger';
import { delay } from '../../utils/promise';
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
} from './worker';
import { Worker } from './worker.builder';

type IIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
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
    ],
  );

  await indexerWorker.initWorker();

  return indexerWorker;
}

function getMaxWorkers(numWorkers?: number): number {
  const maxCPUs = os.cpus().length - 1;
  return Math.min(numWorkers ?? maxCPUs, maxCPUs);
}

export interface IBlockDispatcher {
  enqueueBlocks(heights: number[]): void;

  queueSize: number;
  freeSize: number;
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

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    private eventEmitter: EventEmitter2,
  ) {
    this.fetchQueue = new Queue(nodeConfig.batchSize * 3);
    this.processQueue = new AutoQueue(nodeConfig.batchSize * 3);
  }

  onApplicationShutdown(): void {
    this.processQueue.abort();
  }

  enqueueBlocks(heights: number[]): void {
    logger.info(
      `Enqueing blocks ${heights[0]}...${heights[heights.length - 1]}`,
    );
    this.fetchQueue.putMany(heights);

    this.fetchBlocksFromQueue();
  }

  private fetchBlocksFromQueue() {
    if (this.fetching) return;
    // Process queue is full, no point in fetching more blocks
    if (this.processQueue.freeSpace < this.nodeConfig.batchSize) return;

    this.fetching = true;

    const blockNums = this.fetchQueue.takeMany(this.nodeConfig.batchSize);

    logger.info(
      `fetch block [${blockNums[0]},${
        blockNums[blockNums.length - 1]
      }], total ${blockNums.length} blocks`,
    );

    // Queue is empty
    if (!blockNums.length) {
      this.fetching = false;
      return;
    }

    void fetchBlocksBatches(this.apiService.getApi(), blockNums /* TODO*/)
      .then((blocks) =>
        blocks.map((block) => () => {
          this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
            height: block.block.block.header.number.toNumber(),
            timestamp: Date.now(),
          });
          return this.indexerManager.indexBlock(block, null /* TODO*/);
        }),
      )
      .then((blockTasks) => {
        this.processQueue.putMany(blockTasks);

        // Recurse
        this.fetching = false;
        this.fetchBlocksFromQueue();
      });
  }

  get queueSize(): number {
    return this.fetchQueue.size;
  }

  get freeSize(): number {
    return this.fetchQueue.freeSpace;
  }
}

@Injectable()
export class WorkerBlockDispatcherService
  implements IBlockDispatcher, OnApplicationShutdown
{
  private workers: IndexerWorker[];
  private numWorkers: number;

  private taskCounter = 0;

  private queue: AutoQueue<void>;

  /**
   * @param numWorkers. The number of worker threads to run, this is capped at number of cpus
   * @param workerQueueSize. The number of fetched blocks queued to be processed
   */
  constructor(
    numWorkers: number,
    private workerQueueSize: number,
    private eventEmitter: EventEmitter2,
  ) {
    this.numWorkers = numWorkers;
    this.queue = new AutoQueue(numWorkers * workerQueueSize);
  }

  async init(): Promise<void> {
    this.workers = await Promise.all(
      new Array(this.numWorkers).fill(0).map(() => createIndexerWorker()),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    // Stop processing blocks
    this.queue.abort();

    // Stop all workers
    await Promise.all(this.workers.map((w) => w.terminate()));
  }

  enqueueBlocks(heights: number[]): void {
    logger.info(
      `Enqueing blocks ${heights[0]}...${heights[heights.length - 1]}`,
    );

    heights.map((height) => this.enqueueBlock(height));
  }

  private enqueueBlock(height: number) {
    const workerIdx = this.getNextWorkerIndex();
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);
    const pendingBlock = worker.fetchBlock(height);

    const processBlock = async () => {
      await pendingBlock;

      logger.info(
        `worker ${workerIdx} processing block ${height}, fetched blocks: ${await worker.numFetchedBlocks()}, fetching blocks: ${await worker.numFetchingBlocks()}`,
      );

      console.time(`Process block ${height}`);

      this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
        height,
        timestamp: Date.now(),
      });

      await worker.processBlock(height);
      console.timeEnd(`Process block ${height}`);
    };

    void this.queue.put(processBlock);
  }

  get queueSize(): number {
    return this.queue.size;
  }

  get freeSize(): number {
    return this.queue.freeSpace;
  }

  private getNextWorkerIndex(): number {
    const index = this.taskCounter % this.numWorkers;

    this.taskCounter++;

    return index;
  }
}
