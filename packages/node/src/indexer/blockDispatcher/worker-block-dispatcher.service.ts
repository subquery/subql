// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  getLogger,
  NodeConfig,
  IndexerEvent,
  Worker,
  AutoQueue,
  memoryLock,
  SmartBatchService,
} from '@subql/node-core';
import chalk from 'chalk';
import { last } from 'lodash';
import { ProjectService } from '../project.service';
import { RuntimeService } from '../runtime/runtimeService';
import {
  FetchBlock,
  ProcessBlock,
  InitWorker,
  NumFetchedBlocks,
  NumFetchingBlocks,
  GetWorkerStatus,
  SyncRuntimeService,
  GetSpecFromMap,
  GetMemoryLeft,
  waitForWorkerBatchSize,
  ReloadDynamicDs,
} from '../worker/worker';
import { BaseBlockDispatcher } from './base-block-dispatcher';

const logger = getLogger('WorkerBlockDispatcherService');

type IIndexerWorker = {
  processBlock: ProcessBlock;
  fetchBlock: FetchBlock;
  numFetchedBlocks: NumFetchedBlocks;
  numFetchingBlocks: NumFetchingBlocks;
  getStatus: GetWorkerStatus;
  syncRuntimeService: SyncRuntimeService;
  getSpecFromMap: GetSpecFromMap;
  getMemoryLeft: GetMemoryLeft;
  waitForWorkerBatchSize: waitForWorkerBatchSize;
  reloadDynamicDs: ReloadDynamicDs;
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
      'getStatus',
      'syncRuntimeService',
      'getSpecFromMap',
      'getMemoryLeft',
      'waitForWorkerBatchSize',
      'reloadDynamicDs',
    ],
  );

  await indexerWorker.initWorker();

  return indexerWorker;
}

@Injectable()
export class WorkerBlockDispatcherService
  extends BaseBlockDispatcher<AutoQueue<void>>
  implements OnApplicationShutdown
{
  private workers: IndexerWorker[];
  private numWorkers: number;
  smartBatchService: SmartBatchService;

  private taskCounter = 0;
  private isShutdown = false;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: ProjectService,
    smartBatchService: SmartBatchService,
  ) {
    const numWorkers = nodeConfig.workers;
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      new AutoQueue(numWorkers * nodeConfig.batchSize * 2),
      smartBatchService,
    );
    this.numWorkers = numWorkers;
  }

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    if (this.nodeConfig.unfinalizedBlocks) {
      throw new Error(
        'Sorry, best block feature is not supported with workers yet.',
      );
    }

    this.workers = await Promise.all(
      new Array(this.numWorkers).fill(0).map(() => createIndexerWorker()),
    );

    this.onDynamicDsCreated = onDynamicDsCreated;

    const blockAmount = await this.projectService.getProcessedBlockCount();
    this.setProcessedBlockCount(blockAmount ?? 0);
    // Sync workers runtime from main
    this.runtimeService = runtimeService;
    this.syncWorkerRuntimes();
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

  syncWorkerRuntimes(): void {
    this.workers.map((w) =>
      w.syncRuntimeService(
        this.runtimeService.specVersionMap,
        this.runtimeService.latestFinalizedHeight,
      ),
    );
  }

  async enqueueBlocks(
    cleanedBlocks: number[],
    latestBufferHeight?: number,
  ): Promise<void> {
    if (!!latestBufferHeight && !cleanedBlocks.length) {
      this.latestBufferedHeight = latestBufferHeight;
      return;
    }

    logger.info(
      `Enqueueing blocks ${cleanedBlocks[0]}...${last(cleanedBlocks)}, total ${
        cleanedBlocks.length
      } blocks`,
    );

    // eslint-disable-next-line no-constant-condition
    if (true) {
      let startIndex = 0;
      while (startIndex < cleanedBlocks.length) {
        const workerIdx = await this.getNextWorkerIndex();
        const batchSize = Math.min(
          cleanedBlocks.length - startIndex,
          await this.maxBatchSize(workerIdx),
        );
        await Promise.all(
          cleanedBlocks
            .slice(startIndex, startIndex + batchSize)
            .map((height) => this.enqueueBlock(height, workerIdx)),
        );
        startIndex += batchSize;
      }
    } else {
      cleanedBlocks.map(async (height) => {
        const workerIndex = await this.getNextWorkerIndex();
        return this.enqueueBlock(height, workerIndex);
      });
    }

    this.latestBufferedHeight = latestBufferHeight ?? last(cleanedBlocks);
  }

  private async enqueueBlock(height: number, workerIdx: number) {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this.latestBufferedHeight;

    // get SpecVersion from main runtime service
    const { blockSpecVersion, syncedDictionary } =
      await this.runtimeService.getSpecVersion(height);

    await worker.waitForWorkerBatchSize(this.minimumHeapLimit);

    const pendingBlock = worker.fetchBlock(height, blockSpecVersion);

    const processBlock = async () => {
      try {
        // if main runtime specVersion has been updated, then sync with all workers specVersion map, and lastFinalizedBlock
        if (syncedDictionary) {
          this.syncWorkerRuntimes();
        }

        const start = new Date();
        await pendingBlock;
        const end = new Date();

        if (bufferedHeight > this.latestBufferedHeight) {
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

        this.preProcessBlock(height);

        const { dynamicDsCreated, operationHash, reindexBlockHeight } =
          await worker.processBlock(height);

        await this.postProcessBlock(height, {
          dynamicDsCreated,
          operationHash: Buffer.from(operationHash, 'base64'),
          reindexBlockHeight,
        });

        if (dynamicDsCreated) {
          // Ensure all workers are aware of all dynamic ds
          await Promise.all(this.workers.map((w) => w.reloadDynamicDs()));
        }
      } catch (e) {
        logger.error(
          e,
          `failed to index block at height ${height} ${
            e.handler ? `${e.handler}(${e.stack ?? ''})` : ''
          }`,
        );
        process.exit(1);
      }
    };

    void this.queue.put(processBlock);
  }

  private async maxBatchSize(workerIdx: number): Promise<number> {
    const memLeft = await this.workers[workerIdx].getMemoryLeft();
    if (memLeft < this.minimumHeapLimit) return 0;
    return this.smartBatchService.safeBatchSizeForRemainingMemory(memLeft);
  }

  @Interval(15000)
  async sampleWorkerStatus(): Promise<void> {
    for (const worker of this.workers) {
      const status = await worker.getStatus();
      logger.info(JSON.stringify(status));
    }
  }

  // Getter doesn't seem to cary from abstract class
  get latestBufferedHeight(): number {
    return this._latestBufferedHeight;
  }

  set latestBufferedHeight(height: number) {
    super.latestBufferedHeight = height;
    // There is only a single queue with workers so we treat them as the same
    this.eventEmitter.emit(IndexerEvent.BlockQueueSize, {
      value: this.queueSize,
    });
  }

  private async getNextWorkerIndex(): Promise<number> {
    return Promise.all(
      this.workers.map((worker) => worker.getMemoryLeft()),
    ).then((memoryLeftValues) => {
      return memoryLeftValues.indexOf(Math.max(...memoryLeftValues));
    });
  }
}
