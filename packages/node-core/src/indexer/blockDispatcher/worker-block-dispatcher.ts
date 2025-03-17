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
import {AutoQueue} from '../../utils';
import {MonitorServiceInterface} from '../monitor.service';
import {StoreService} from '../store.service';
import {IStoreModelProvider} from '../storeModelProvider';
import {ISubqueryProject, IProjectService, Header} from '../types';
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
  private fetchQueue: AutoQueue<Header>;

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
      poiSyncService
    );

    const fetchQueueSize = nodeConfig.batchSize * 3 * (nodeConfig.workers ?? 1);
    this.fetchQueue = new AutoQueue(fetchQueueSize, fetchQueueSize, nodeConfig.timeout, 'Fetch');

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

    // Needs to happen before enqueuing heights so discardBlock check works.
    // Unlike with the normal dispatcher there is not a queue ob blockHeights to delay this.
    this.latestBufferedHeight = latestBufferHeight ?? last(heights as number[]) ?? this.latestBufferedHeight;

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
  }

  private enqueueBlock(height: number, workerIdx: number): void {
    if (this.isShutdown) return;
    const worker = this.workers[workerIdx];

    assert(worker, `Worker ${workerIdx} not found`);

    // Used to compare before and after as a way to check if queue was flushed
    const bufferedHeight = this.latestBufferedHeight;

    /*
     Wrap the promise in a fetchQueue for 2 reasons:
     1. It retains the order when resolving the fetched promises
     2. It means `this.queue` doesn't fill up with tasks awaiting pendingBlocks which then means we can abort fetching and wait for idle
    */
    const pendingBlock = this.fetchQueue.put(() =>
      this.blockchainService.fetchBlockWorker(worker, height, {workers: this.workers})
    );

    void this.pipeBlock({
      fetchTask: pendingBlock,
      processBlock: async () => {
        monitorWrite(`Processing from worker #${workerIdx}`);
        return worker.processBlock(height);
      },
      discardBlock: () => bufferedHeight > this.latestBufferedHeight,
      processQueue: this.queue,
      abortFetching: async () => {
        await Promise.all(this.workers.map((w) => w.abortFetching()));
        // Wait for any pending blocks to be processed
        this.fetchQueue.abort();
      },
      getHeader: (header) => header,
      height,
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
