// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {delay} from '@subql/common';
import {NodeConfig} from '../../configure';
import {exitWithError} from '../../process';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {Header, IBlock} from '../types';
import {BaseWorkerService, IBaseIndexerWorker, WorkerStatusResponse} from '../worker';
import {IBlockDispatcher, ProcessBlockResponse} from './base-block-dispatcher';
import {BlockDispatcher} from './block-dispatcher';
import {WorkerBlockDispatcher} from './worker-block-dispatcher';

let failureBlocks: number[] = [];
let indexBlockFunction: (block: IBlock<number>) => Promise<void>;
let workerIdx = 0;

const nodeConfig = new NodeConfig({batchSize: 10, workers: 2} as any);

function resolveablePromise(): [Promise<void>, () => void] {
  let resolve: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return [promise, resolve!];
}

const projectService = {
  getDataSources: jest.fn(),
  hasDataSourcesAfterHeight: jest.fn(),
  reindex: jest.fn(),
} as any;

const projectUpgradeService = {
  setCurrentHeight: jest.fn(),
} as any;

const storeService = {
  setBlockHeader: jest.fn(),
  getOperationMerkleRoot: jest.fn(),
  transaction: null,
  getStore: jest.fn(),
} as any;

const storeModelProvider = {
  metadata: {
    find: jest.fn(),
    set: jest.fn(),
    setBulk: jest.fn(),
    setIncrement: jest.fn(),
  },
  applyPendingChanges: jest.fn(),
} as any;

const blockchainService = {
  getBlockSize: jest.fn(),
  fetchBlocks: async ([blockNum]: number[]) => {
    await delay(0.1);

    if (failureBlocks.includes(blockNum)) {
      await delay(0.3);
      throw new Error(`Failed to fetch block ${blockNum}`);
    }
    return [
      {
        block: blockNum,
        getHeader: () => ({
          blockHeight: blockNum,
          timestamp: new Date(),
        }),
      },
    ];
  },
  fetchBlockWorker: (worker: TestWorker, height: number) => worker.fetchBlock(height),
} as any;

class TestWorkerService extends BaseWorkerService<number, Header> {
  async fetchChainBlock(height: number): Promise<IBlock<number>> {
    await delay(0.1);
    if (failureBlocks.includes(height)) {
      await delay(0.3);
      throw new Error(`Failed to fetch block ${height}`);
    }
    return {
      block: height,
      getHeader: () => ({
        blockHeight: height,
        blockHash: height.toString(),
        parentHash: (height - 1).toString(),
        timestamp: new Date(),
      }),
    };
  }
  toBlockResponse(block: number): Header {
    return {
      blockHeight: block,
      blockHash: block.toString(),
      parentHash: (block - 1).toString(),
      timestamp: new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async processFetchedBlock(block: IBlock<number>): Promise<ProcessBlockResponse> {
    await indexBlockFunction?.(block);

    return {
      dynamicDsCreated: false,
      reindexBlockHeader: null,
    };
  }
  getBlockSize(block: IBlock<number>): number {
    return 1;
  }
}

class TestWorker implements IBaseIndexerWorker {
  private threradId = workerIdx++;
  constructor(public workerService: TestWorkerService) {}
  async processBlock(height: number): Promise<ProcessBlockResponse> {
    return this.workerService.processBlock(height);
  }
  async fetchBlock(height: number): Promise<Header> {
    return this.workerService.fetchBlock(height, {});
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async numFetchedBlocks(): Promise<number> {
    return this.workerService.numFetchedBlocks;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async numFetchingBlocks(): Promise<number> {
    return this.workerService.numFetchingBlocks;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getStatus(): Promise<WorkerStatusResponse> {
    return {
      threadId: this.threradId + 1,
      isIndexing: this.workerService.isIndexing,
      fetchedBlocks: this.workerService.numFetchedBlocks,
      toFetchBlocks: 0,
    };
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMemoryLeft(): Promise<number> {
    return 1;
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async abortFetching(): Promise<void> {
    return this.workerService.abortFetching();
  }

  terminate() {
    /* Do nothing*/
  }
}

// Stop the application exiting
jest.mock('../../process', () => ({
  ...jest.requireActual('../../process'),
  exitWithError: jest.fn(),
}));

jest.mock('../worker', () => ({
  ...jest.requireActual('../worker'),
  createIndexerWorker: jest.fn(() => {
    const workerService = new TestWorkerService(projectService, projectUpgradeService, nodeConfig);

    return new TestWorker(workerService);
  }),
}));

describe.each<[string, () => IBlockDispatcher<number>]>([
  [
    'BlockDispatcher',
    (): IBlockDispatcher<number> => {
      const indexerManager = {
        indexBlock: async (input: IBlock<number>) => {
          await indexBlockFunction(input);
          return {};
        },
      } as any;

      // Needs to be before block dispatcher constructor
      blockchainService as any;

      return new BlockDispatcher(
        nodeConfig,
        new EventEmitter2(),
        projectService,
        projectUpgradeService,
        storeService,
        storeModelProvider,
        {} as any, // PoiSyncService
        {
          id: 'id',
        } as any, // ISubqueryProject
        blockchainService,
        indexerManager
      );
    },
  ],
  [
    'WorkerBlockDispatcher',
    (): IBlockDispatcher<number> => {
      return new WorkerBlockDispatcher(
        nodeConfig,
        new EventEmitter2(),
        projectService,
        projectUpgradeService,
        storeService,
        storeModelProvider,
        {getCache: jest.fn()} as any, // CacheService
        {} as any, // PoiSyncService
        {} as any, // DynamicDsService
        {} as any, // UnfinalizedBlockService
        new ConnectionPoolStateManager(() => {
          /* Do nothing */
        }),
        {
          id: 'id',
        } as any, // ISubqueryProject
        blockchainService,
        '', // workerPath
        [] // workerFns
      );
    },
  ],
])('%s', (name, initDispatcher) => {
  let blockDispatcher: IBlockDispatcher<number>;

  beforeEach(async () => {
    failureBlocks = [];
    indexBlockFunction = jest.fn();
    workerIdx = 0;

    blockDispatcher = initDispatcher();

    await blockDispatcher.init(jest.fn());
  });

  afterEach(async () => {
    if (blockDispatcher instanceof BlockDispatcher || blockDispatcher instanceof WorkerBlockDispatcher) {
      await blockDispatcher.onApplicationShutdown();
    }
  });

  it('should finish indexing fetched blocks before shutdown when fetching a block fails', async () => {
    const indexedBlocks: number[] = [];
    failureBlocks = [5];

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.4);
      indexedBlocks.push(block.block);
    });

    await blockDispatcher.enqueueBlocks([1, 2, 3, 4, 5, 6, 7], 7);
    await delay(2);

    await blockDispatcher.enqueueBlocks([8, 9, 10], 10);

    expect(exitWithError).toHaveBeenCalled();

    // Should index 4 blocks
    expect(indexBlockFunction).toHaveBeenCalledTimes(4);
    expect(indexedBlocks).toEqual([1, 2, 3, 4]);
  });

  it('should finish indexing fetched blocks before shutdown when fetching multiple blocks fail', async () => {
    const indexedBlocks: number[] = [];
    failureBlocks = [5, 6, 7];

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.4);
      indexedBlocks.push(block.block);
    });

    await blockDispatcher.enqueueBlocks([1, 2, 3, 4, 5, 6, 7], 7);
    await delay(2);

    await blockDispatcher.enqueueBlocks([8, 9, 10], 10);

    expect(exitWithError).toHaveBeenCalled();

    // Should index 4 blocks
    expect(indexBlockFunction).toHaveBeenCalledTimes(4);
    expect(indexedBlocks).toEqual([1, 2, 3, 4]);
  });

  // This simulates a rewind or a new dynamic datasource changing the blocks to index
  it('discards blocks from fetching if the latest buffered height reduces', async () => {
    const indexedBlocks: number[] = [];

    const [pendingBlock3, resolveBlock3] = resolveablePromise();
    const [pendingBlock5, resolveBlock5] = resolveablePromise();

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.4);
      indexedBlocks.push(block.block);
      if (block.block === 3) {
        resolveBlock3();
      }
      if (block.block === 5) {
        resolveBlock5();
      }
    });

    await blockDispatcher.enqueueBlocks([1, 3, 5, 7], 7);
    // Wait for some blocks to be indexed
    await pendingBlock3;

    // Update blocks, rewinding last processed height
    await blockDispatcher.enqueueBlocks([4, 5], 5);
    await pendingBlock5;

    expect(indexedBlocks).toEqual([1, 3, 4, 5]);
  });
});
