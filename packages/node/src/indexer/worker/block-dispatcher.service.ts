// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import os from 'os';
import path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { SubstrateBlock } from '@subql/types';
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

  // Remove all enqueued blocks, used when a dynamic ds is created
  flushQueue(): void;
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
    this.isShutdown = true;
    this.processQueue.abort();
  }

  enqueueBlocks(heights: number[]): void {
    logger.info(
      `Enqueing blocks ${heights[0]}...${heights[heights.length - 1]}`,
    );
    this.fetchQueue.putMany(heights);

    void this.fetchBlocksFromQueue().catch((e) => {
      logger.error(e, 'Failed to fetch blocks from queue');
      throw e;
    });
  }

  flushQueue(): void {
    this.fetchQueue.flush(); // Empty
    this.processQueue.flush();
  }

  private async fetchBlocksFromQueue(): Promise<void> {
    if (this.fetching || this.isShutdown) return;
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

    const blocks = await fetchBlocksBatches(
      this.apiService.getApi(),
      blockNums,
    );

    const blockTasks = blocks.map((block) => async () => {
      const height = block.block.block.header.number.toNumber();
      logger.info(`INDEXING BLOCK ${height}`);
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
    if (this.isShutdown) return;

    await Promise.all(this.processQueue.putMany(blockTasks));

    // Recurse
    this.fetching = false;
    await this.fetchBlocksFromQueue();
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
  private getRuntimeVersion: GetRuntimeVersion;
  private onDynamicDsCreated: (height: number) => Promise<void>;

  private taskCounter = 0;
  private isShutdown = false;
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
    logger.info(
      `Enqueing blocks ${heights[0]}...${heights[heights.length - 1]}`,
    );

    heights.map((height) => this.enqueueBlock(height));
  }

  flushQueue(): void {
    this.queue.flush();
  }

  private enqueueBlock(height: number) {
    if (this.isShutdown) return;
    const workerIdx = this.getNextWorkerIndex();
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);
    const pendingBlock = worker.fetchBlock(height);

    const processBlock = async () => {
      const start = new Date();
      const result = await pendingBlock;
      const end = new Date();

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

      logger.info(
        `worker ${workerIdx} processing block ${height}, fetched blocks: ${await worker.numFetchedBlocks()}, fetching blocks: ${await worker.numFetchingBlocks()}`,
      );

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

  setRuntimeVersionGetter(fn: GetRuntimeVersion): void {
    this.getRuntimeVersion = fn;
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
