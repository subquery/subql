// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {last} from 'lodash';
import {Sequelize, Transaction} from 'sequelize';
import {NodeConfig} from '../../configure';
import {IndexerEvent} from '../../events';
import {getLogger} from '../../logger';
import {AutoQueue} from '../../utils';
import {DynamicDsService} from '../dynamic-ds.service';
import {PoiService} from '../poi.service';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IProjectNetworkConfig, IProjectService, ISubqueryProject} from '../types';
import {BaseBlockDispatcher} from './base-block-dispatcher';

const logger = getLogger('WorkerBlockDispatcherService');

type Worker = {
  processBlock: (height: number) => Promise<any>;
  getStatus: () => Promise<any>;
  terminate: () => Promise<number>;
};

export abstract class WorkerBlockDispatcher<DS, W extends Worker>
  extends BaseBlockDispatcher<AutoQueue<void>>
  implements OnApplicationShutdown
{
  protected workers: W[];
  private numWorkers: number;

  private taskCounter = 0;
  private isShutdown = false;

  protected abstract fetchBlock(worker: W, height: number): Promise<void>;
  protected abstract prepareTx(tx: Transaction): void;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    projectService: IProjectService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    private sequelize: Sequelize,
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
      new AutoQueue(nodeConfig.workers * nodeConfig.batchSize * 2),
      storeService,
      storeCacheService,
      poiService,
      dynamicDsService
    );
    this.numWorkers = nodeConfig.workers;
  }

  async init(onDynamicDsCreated: (height: number) => Promise<void>): Promise<void> {
    if (this.nodeConfig.unfinalizedBlocks) {
      throw new Error('Sorry, best block feature is not supported with workers yet.');
    }

    this.workers = await Promise.all(new Array(this.numWorkers).fill(0).map(() => this.createIndexerWorker()));

    this.onDynamicDsCreated = onDynamicDsCreated;

    const blockAmount = await this.projectService.getProcessedBlockCount();
    this.setProcessedBlockCount(blockAmount ?? 0);
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

  enqueueBlocks(heights: number[], latestBufferHeight?: number): void {
    if (!!latestBufferHeight && !heights.length) {
      this.latestBufferedHeight = latestBufferHeight;
      return;
    }

    logger.info(`Enqueueing blocks ${heights[0]}...${last(heights)}, total ${heights.length} blocks`);

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
      heights.map((height) => this.enqueueBlock(height, this.getNextWorkerIndex()));
    }

    this.latestBufferedHeight = latestBufferHeight ?? last(heights);
  }

  private enqueueBlock(height: number, workerIdx: number) {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this.latestBufferedHeight;

    const processBlock = async () => {
      let tx: Transaction;
      try {
        await this.fetchBlock(worker, height);
        if (bufferedHeight > this.latestBufferedHeight) {
          logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
          return;
        }

        tx = await this.sequelize.transaction();

        this.preProcessBlock(height, tx);
        this.prepareTx(tx);

        const {blockHash, dynamicDsCreated, reindexBlockHeight} = await worker.processBlock(height);

        await this.postProcessBlock(height, tx, {
          dynamicDsCreated,
          blockHash,
          reindexBlockHeight,
        });

        await tx.commit();
      } catch (e) {
        await tx.rollback();
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

  private getNextWorkerIndex(): number {
    const index = this.taskCounter % this.numWorkers;

    this.taskCounter++;

    return index;
  }
}
