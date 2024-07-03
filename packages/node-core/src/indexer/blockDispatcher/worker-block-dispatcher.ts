// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {last} from 'lodash';
import {NodeConfig} from '../../configure';
import {IProjectUpgradeService} from '../../configure/ProjectUpgrade.service';
import {IndexerEvent} from '../../events';
import {IBlock, PoiSyncService} from '../../indexer';
import {getLogger} from '../../logger';
import {monitorWrite} from '../../process';
import {AutoQueue, isTaskFlushedError} from '../../utils';
import {MonitorServiceInterface} from '../monitor.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {ISubqueryProject, IProjectService} from '../types';
import {isBlockUnavailableError} from '../worker/utils';
import {BaseBlockDispatcher} from './base-block-dispatcher';

const logger = getLogger('WorkerBlockDispatcherService');

type Worker = {
  processBlock: (height: number) => Promise<any>;
  getStatus: () => Promise<any>;
  getMemoryLeft: () => Promise<number>;
  getBlocksLoaded: () => Promise<number>;
  waitForWorkerBatchSize: (heapSizeInBytes: number) => Promise<void>;
  terminate: () => Promise<number>;
};

function initAutoQueue<T>(
  workers: number | undefined,
  batchSize: number,
  timeout?: number,
  name?: string
): AutoQueue<T> {
  assert(workers && workers > 0, 'Number of workers must be greater than 0');
  return new AutoQueue(workers * batchSize * 2, 1, timeout, name);
}

export abstract class WorkerBlockDispatcher<DS, W extends Worker, B>
  extends BaseBlockDispatcher<AutoQueue<void>, DS, B>
  implements OnApplicationShutdown
{
  protected workers: W[] = [];
  private numWorkers: number;
  private isShutdown = false;
  private currentWorkerIndex = 0;

  protected abstract fetchBlock(worker: W, height: number): Promise<void>;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: IProjectService<DS>,
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    project: ISubqueryProject,
    private createIndexerWorker: () => Promise<W>,
    monitorService?: MonitorServiceInterface
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      projectUpgradeService,
      initAutoQueue(nodeConfig.workers, nodeConfig.batchSize, nodeConfig.timeout, 'Worker'),
      storeService,
      storeCacheService,
      poiSyncService,
      monitorService
    );
    // initAutoQueue will assert that workers is set. unfortunately we cant do anything before the super call
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.numWorkers = nodeConfig.workers!;
  }

  async init(onDynamicDsCreated: (height: number) => void): Promise<void> {
    this.workers = await Promise.all(new Array(this.numWorkers).fill(0).map(() => this.createIndexerWorker()));
    return super.init(onDynamicDsCreated);
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
  async enqueueBlocks(heights: (IBlock<B> | number)[], latestBufferHeight?: number): Promise<void> {
    assert(
      heights.every((h) => typeof h === 'number'),
      'Worker block dispatcher only supports enqueuing numbers, not blocks.'
    );

    // In the case where factors of batchSize is equal to bypassBlock or when heights is []
    // to ensure block is bypassed, we set the latestBufferHeight to the heights
    // make sure lastProcessedHeight in metadata is updated
    if (!!latestBufferHeight && !heights.length) {
      heights = [latestBufferHeight];
    }

    logger.info(`Enqueueing blocks ${heights[0]}...${last(heights)}, total ${heights.length} blocks`);

    // eslint-disable-next-line no-constant-condition
    if (true) {
      let startIndex = 0;
      while (startIndex < heights.length) {
        const workerIdx = await this.getNextWorkerIndex();
        const batchSize = Math.min(heights.length - startIndex, await this.maxBatchSize(workerIdx));
        await Promise.all(
          heights
            .slice(startIndex, startIndex + batchSize)
            .map((height) => this.enqueueBlock(height as number, workerIdx))
        );
        startIndex += batchSize;
      }
    } else {
      /*
       * Load balancing:
       * worker1: 1,3,5
       * worker2: 2,4,6
       */
      heights.map(async (height) => this.enqueueBlock(height as number, await this.getNextWorkerIndex()));
    }

    this.latestBufferedHeight = latestBufferHeight ?? last(heights as number[]) ?? this.latestBufferedHeight;
  }

  private async enqueueBlock(height: number, workerIdx: number): Promise<void> {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this.latestBufferedHeight;

    await worker.waitForWorkerBatchSize(this.minimumHeapLimit);

    const pendingBlock = this.fetchBlock(worker, height);

    const processBlock = async () => {
      try {
        await pendingBlock;
        if (bufferedHeight > this.latestBufferedHeight) {
          logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
          return;
        }

        await this.preProcessBlock(height);

        monitorWrite(`Processing from worker #${workerIdx}`);
        const {blockHash, dynamicDsCreated, reindexBlockHeight} = await worker.processBlock(height);

        await this.postProcessBlock(height, {
          dynamicDsCreated,
          blockHash,
          reindexBlockHeight,
        });
      } catch (e: any) {
        // TODO discard any cache changes from this block height

        if (isBlockUnavailableError(e)) {
          return;
        }
        logger.error(
          e,
          `failed to index block at height ${height} ${e.handler ? `${e.handler}(${e.stack ?? ''})` : ''}`
        );
        process.exit(1);
      }
    };

    void this.queue.put(processBlock).catch((e) => {
      if (isTaskFlushedError(e)) {
        return;
      }
      throw e;
    });
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
    const startIndex = this.currentWorkerIndex;
    do {
      this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workers.length;
      const memLeft = await this.workers[this.currentWorkerIndex].getMemoryLeft();
      if (memLeft >= this.minimumHeapLimit) {
        return this.currentWorkerIndex;
      }
    } while (this.currentWorkerIndex !== startIndex);

    // All workers have been tried and none have enough memory left.
    // wait for any worker to free the memory before calling getNextWorkerIndex again
    await Promise.race(this.workers.map((worker) => worker.waitForWorkerBatchSize(this.minimumHeapLimit)));

    return this.getNextWorkerIndex();
  }

  private async maxBatchSize(workerIdx: number): Promise<number> {
    const memLeft = await this.workers[workerIdx].getMemoryLeft();
    if (memLeft < this.minimumHeapLimit) return 0;
    return this.smartBatchService.safeBatchSizeForRemainingMemory(memLeft);
  }
}
