// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {last} from 'lodash';
import {NodeConfig} from '../../configure';
import {IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {AutoQueue} from '../../utils';
import {DynamicDsService} from '../dynamic-ds.service';
import {PoiService} from '../poi.service';
import {SmartBatchService} from '../smartBatch.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IProjectNetworkConfig, IProjectService, ISubqueryProject} from '../types';
import {BaseBlockDispatcher} from './base-block-dispatcher';

const logger = getLogger('WorkerBlockDispatcherService');

type Worker = {
  processBlock: (height: number) => Promise<any>;
  getStatus: () => Promise<any>;
  getMemoryLeft: () => Promise<number>;
  waitForWorkerBatchSize: (heapSizeInBytes: number) => Promise<void>;
  terminate: () => Promise<number>;
};

function initAutoQueue<T>(workers: number | undefined, batchSize: number): AutoQueue<T> {
  assert(workers && workers > 0, 'Number of workers must be greater than 0');
  return new AutoQueue(workers * batchSize * 2);
}

export abstract class WorkerBlockDispatcher<DS, W extends Worker>
  extends BaseBlockDispatcher<AutoQueue<void>, DS>
  implements OnApplicationShutdown
{
  protected workers: W[] = [];
  private numWorkers: number;
  private isShutdown = false;

  protected abstract fetchBlock(worker: W, height: number): Promise<void>;

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
    private createIndexerWorker: () => Promise<W>
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      initAutoQueue(nodeConfig.workers, nodeConfig.batchSize),
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      dynamicDsService
    );
    // initAutoQueue will assert that workers is set. unfortunately we cant do anything before the super call
    this.numWorkers = nodeConfig.workers!;
  }

  async init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void> {
    if (this.nodeConfig.unfinalizedBlocks) {
      throw new Error('Sorry, best block feature is not supported with workers yet.');
    }

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

  async enqueueBlocks(heights: number[], latestBufferHeight?: number): Promise<void> {
    // In the case where factors of batchSize is equal to bypassBlock or when heights is []
    // to ensure block is bypassed, latestBufferHeight needs to be manually set
    if (!!latestBufferHeight && !heights.length) {
      await this.jumpBufferedHeight(latestBufferHeight);
      return;
    }

    logger.info(`Enqueueing blocks ${heights[0]}...${last(heights)}, total ${heights.length} blocks`);

    // eslint-disable-next-line no-constant-condition
    if (true) {
      let startIndex = 0;
      while (startIndex < heights.length) {
        const workerIdx = await this.getNextWorkerIndex();
        const batchSize = Math.min(heights.length - startIndex, await this.maxBatchSize(workerIdx));
        await Promise.all(
          heights.slice(startIndex, startIndex + batchSize).map((height) => this.enqueueBlock(height, workerIdx))
        );
        startIndex += batchSize;
      }
    } else {
      /*
       * Load balancing:
       * worker1: 1,3,5
       * worker2: 2,4,6
       */
      heights.map(async (height) => this.enqueueBlock(height, await this.getNextWorkerIndex()));
    }

    this.latestBufferedHeight = latestBufferHeight ?? last(heights) ?? this.latestBufferedHeight;
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

        this.preProcessBlock(height);

        const {blockHash, dynamicDsCreated, reindexBlockHeight} = await worker.processBlock(height);

        await this.postProcessBlock(height, {
          dynamicDsCreated,
          blockHash,
          reindexBlockHeight,
        });
      } catch (e: any) {
        // TODO discard any cache changes from this block height
        logger.error(
          e,
          `failed to index block at height ${height} ${e.handler ? `${e.handler}(${e.stack ?? ''})` : ''}`
        );
        process.exit(1);
      }
    };

    void this.queue.put(processBlock);
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
    return Promise.all(this.workers.map((worker) => worker.getMemoryLeft())).then((memoryLeftValues) => {
      return memoryLeftValues.indexOf(Math.max(...memoryLeftValues));
    });
  }

  private async maxBatchSize(workerIdx: number): Promise<number> {
    const memLeft = await this.workers[workerIdx].getMemoryLeft();
    if (memLeft < this.minimumHeapLimit) return 0;
    return this.smartBatchService.safeBatchSizeForRemainingMemory(memLeft);
  }
}
