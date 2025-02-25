// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {Inject, Injectable, OnApplicationShutdown} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {Interval} from '@nestjs/schedule';
import {BaseDataSource} from '@subql/types-core';
import {last} from 'lodash';
import {IApiConnectionSpecific} from '../../api.service';
import {IBlockchainService} from '../../blockchain.service';
import {NodeConfig} from '../../configure';
import {IProjectUpgradeService} from '../../configure/ProjectUpgrade.service';
import {IndexerEvent} from '../../events';
import {
  ConnectionPoolStateManager,
  createIndexerWorker,
  DynamicDsService,
  IBaseIndexerWorker,
  IBlock,
  InMemoryCacheService,
  PoiSyncService,
  TerminateableWorker,
  UnfinalizedBlocksService,
} from '../../indexer';
import {getLogger} from '../../logger';
import {monitorWrite} from '../../process';
import {AutoQueue, isTaskFlushedError} from '../../utils';
import {MonitorServiceInterface} from '../monitor.service';
import {StoreService} from '../store.service';
import {IStoreModelProvider} from '../storeModelProvider';
import {ISubqueryProject, IProjectService} from '../types';
import {isBlockUnavailableError} from '../worker/utils';
import {BaseBlockDispatcher} from './base-block-dispatcher';

const logger = getLogger('WorkerBlockDispatcherService');

function initAutoQueue<T>(
  workers: number | undefined,
  batchSize: number,
  timeout?: number,
  name?: string
): AutoQueue<T> {
  assert(workers && workers > 0, 'Number of workers must be greater than 0');
  return new AutoQueue(workers * batchSize * 2, 1, timeout, name);
}

@Injectable()
export class WorkerBlockDispatcher<
    DS extends BaseDataSource = BaseDataSource,
    Worker extends IBaseIndexerWorker = IBaseIndexerWorker,
    Block = any,
    ApiConn extends IApiConnectionSpecific = IApiConnectionSpecific,
  >
  extends BaseBlockDispatcher<AutoQueue<void>, DS, Block>
  implements OnApplicationShutdown
{
  protected workers: TerminateableWorker<Worker>[] = [];
  private numWorkers: number;
  private isShutdown = false;

  private createWorker: () => Promise<TerminateableWorker<Worker>>;

  constructor(
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<DS>,
    @Inject('IProjectUpgradeService') projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeModelProvider: IStoreModelProvider,
    cacheService: InMemoryCacheService,
    poiSyncService: PoiSyncService,
    dynamicDsService: DynamicDsService<DS>,
    unfinalizedBlocksService: UnfinalizedBlocksService<Block>,
    connectionPoolState: ConnectionPoolStateManager<ApiConn>,
    @Inject('ISubqueryProject') project: ISubqueryProject,
    @Inject('IBlockchainService') private blockchainService: IBlockchainService<DS>,
    workerPath: string,
    workerFns: Parameters<typeof createIndexerWorker<Worker, ApiConn, Block, DS>>[1],
    monitorService?: MonitorServiceInterface,
    workerData?: unknown
  ) {
    super(
      nodeConfig,
      eventEmitter,
      project,
      projectService,
      projectUpgradeService,
      initAutoQueue(nodeConfig.workers, nodeConfig.batchSize, nodeConfig.timeout, 'Worker'),
      storeService,
      storeModelProvider,
      poiSyncService,
      monitorService
    );

    this.createWorker = () =>
      createIndexerWorker<Worker, ApiConn, Block, DS>(
        workerPath,
        workerFns,
        storeService.getStore(),
        cacheService.getCache(),
        dynamicDsService,
        unfinalizedBlocksService,
        connectionPoolState,
        project.root,
        projectService.startHeight,
        monitorService,
        workerData
      );
    // initAutoQueue will assert that workers is set. unfortunately we cant do anything before the super call
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.numWorkers = nodeConfig.workers!;
  }

  async init(onDynamicDsCreated: (height: number) => void): Promise<void> {
    this.workers = await Promise.all(new Array(this.numWorkers).fill(0).map(() => this.createWorker()));
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

  async enqueueBlocks(heights: (IBlock<Block> | number)[], latestBufferHeight?: number): Promise<void> {
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
      /*
       * Load balancing:
       * worker1: 1,2,3
       * worker2: 4,5,6
       */
      const workerIdx = await this.getNextWorkerIndex();
      heights.map((height) => this.enqueueBlock(height as number, workerIdx));
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

  private enqueueBlock(height: number, workerIdx: number): void {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this.latestBufferedHeight;

    const pendingBlock = this.blockchainService.fetchBlockWorker(worker, height, {workers: this.workers});

    const processBlock = async () => {
      try {
        const header = await pendingBlock;
        if (bufferedHeight > this.latestBufferedHeight) {
          logger.debug(`Queue was reset for new DS, discarding fetched blocks`);
          return;
        }

        await this.preProcessBlock(header);

        monitorWrite(`Processing from worker #${workerIdx}`);
        const {dynamicDsCreated, reindexBlockHeader} = await worker.processBlock(height);

        await this.postProcessBlock(header, {
          dynamicDsCreated,
          reindexBlockHeader,
        });
      } catch (e: any) {
        // TODO discard any cache changes from this block height
        if (isTaskFlushedError(e)) {
          return;
        }
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

  // Finds the minimum toFetchBlocks amongst workers then randomly selects from onese that have a matching minimum
  private async getNextWorkerIndex(): Promise<number> {
    const statuses = await Promise.all(this.workers.map((worker) => worker.getStatus()));
    const metric = statuses.map((s) => s.toFetchBlocks);
    const lowest = statuses.filter((s) => s.toFetchBlocks === Math.min(...metric));
    const randIndex = Math.floor(Math.random() * lowest.length);

    return lowest[randIndex].threadId - 1;
  }
}
