// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {delay} from '@subql/common';
import {isTaskFlushedError, TaskFlushedError} from '@subql/node-core/utils';
import {NodeConfig} from '../../configure';
import {exitWithError} from '../../process';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {MultiChainRewindService} from '../multiChainRewind.service';
import {Header, IBlock} from '../types';
import {BaseWorkerService, BlockUnavailableError, IBaseIndexerWorker, WorkerStatusResponse} from '../worker';
import {IBlockDispatcher, ProcessBlockResponse} from './base-block-dispatcher';
import {BlockDispatcher} from './block-dispatcher';
import {WorkerBlockDispatcher} from './worker-block-dispatcher';

let failureBlocks: number[] = [];
let indexBlockFunction: (block: IBlock<number>) => Promise<void | ProcessBlockResponse>;
let workerIdx = 0;

const nodeConfig = new NodeConfig({batchSize: 10, workers: 2} as any);

const defaultFetchBlocksFunction = async (height: number): Promise<IBlock<number>> => {
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
};

let dynamicDsCreatedBlock: number[] = [];
let fetchBlocksFunction = defaultFetchBlocksFunction;

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
    const res = await fetchBlocksFunction(blockNum);
    return [res];
  },
  fetchBlockWorker: (worker: TestWorker, height: number) => worker.fetchBlock(height),
} as any;
const multichainRewindService = {waitRewindHeader: undefined} as MultiChainRewindService;
class TestWorkerService extends BaseWorkerService<number, Header> {
  async fetchChainBlock(height: number): Promise<IBlock<number>> {
    return fetchBlocksFunction(height);
  }
  toBlockResponse(block: IBlock<number>): Header {
    return {
      blockHeight: block.block,
      blockHash: block.block.toString(),
      parentHash: (block.block - 1).toString(),
      timestamp: new Date(),
    };
  }

  async processFetchedBlock(block: IBlock<number>): Promise<ProcessBlockResponse> {
    const res = await indexBlockFunction?.(block);

    if (res) {
      return res;
    }

    return {
      dynamicDsCreated: dynamicDsCreatedBlock.includes(block.block),
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
      toFetchBlocks: this.workerService.numFetchingBlocks,
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
jest.mock('../../utils/queues/autoQueue', () => {
  const original = jest.requireActual('../../utils/queues/autoQueue');
  return {
    ...original,
    isTaskFlushedError: jest.fn(original.isTaskFlushedError),
  };
});

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
          const res = await indexBlockFunction(input);

          if (res) {
            return res;
          }

          return {
            dynamicDsCreated: dynamicDsCreatedBlock.includes(input.block),
            reindexBlockHeader: null,
          };
        },
      } as any;

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
        indexerManager,
        multichainRewindService
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
        multichainRewindService,
        '', // workerPath
        [] // workerFns
      );
    },
  ],
])('%s', (name, initDispatcher) => {
  let blockDispatcher: IBlockDispatcher<number>;

  beforeEach(async () => {
    fetchBlocksFunction = defaultFetchBlocksFunction;
    failureBlocks = [];
    indexBlockFunction = jest.fn();
    workerIdx = 0;

    blockDispatcher = initDispatcher();

    await blockDispatcher.init(blockDispatcher.flushQueue.bind(blockDispatcher));
  });

  afterEach(async () => {
    dynamicDsCreatedBlock = [];
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

  it('should finish indexing fetched blocks before shutdown when an earlier block fails to fetch after a later block', async () => {
    const indexedBlocks: number[] = [];
    failureBlocks = [5];

    fetchBlocksFunction = async (height: number): Promise<IBlock<number>> => {
      await delay(0.1);
      if (failureBlocks.includes(height)) {
        await delay(1);
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
    };

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.4);
      indexedBlocks.push(block.block);
    });

    // Split over 2 calls to be sent do different workers.
    await blockDispatcher.enqueueBlocks([1, 2, 3, 4, 5], 5);
    await blockDispatcher.enqueueBlocks([6, 7, 8], 8);
    await delay(2);

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

  it('correctly sets the free size', async () => {
    const [pendingBlock, resolveBlock] = resolveablePromise();

    fetchBlocksFunction = async (height: number): Promise<IBlock<number>> => {
      await pendingBlock;
      return {
        block: height,
        getHeader: () => ({
          blockHeight: height,
          blockHash: height.toString(),
          parentHash: (height - 1).toString(),
          timestamp: new Date(),
        }),
      };
    };

    // Startup should have free size
    expect(blockDispatcher.freeSize).toBeGreaterThan(0);

    const blocks = new Array(blockDispatcher.freeSize).fill(0).map((_, idx) => idx + 1);
    const lastBlock = blocks[blocks.length - 1];
    await blockDispatcher.enqueueBlocks(blocks, lastBlock);

    // BlockDispatcher will take all the items from the queue and put them straight into the fetch queue. So the value doesn't change initially
    const expectedSize = blockDispatcher instanceof BlockDispatcher ? 30 : 0;

    expect(blockDispatcher.freeSize).toBe(expectedSize);

    // Trigger blocks being fetched
    resolveBlock();
  });

  it('handles a task flushed error', async () => {
    const indexedBlocks: number[] = [];

    fetchBlocksFunction = async (height: number): Promise<IBlock<number>> => {
      await delay(0.1);
      return {
        block: height,
        getHeader: () => ({
          blockHeight: height,
          blockHash: height.toString(),
          parentHash: (height - 1).toString(),
          timestamp: new Date(),
        }),
      };
    };

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.1);
      indexedBlocks.push(block.block);

      if (block.block === 2) {
        return {
          dynamicDsCreated: true,
          reindexBlockHeader: block.getHeader(),
        };
      }
    });

    // Split over 2 calls to be sent do different workers.
    await blockDispatcher.enqueueBlocks([1, 2, 3, 4, 5], 5);
    await blockDispatcher.enqueueBlocks([6, 7, 8], 8);
    await delay(2);

    // This should flush the blocks after the height where dynamicDs is created
    expect(indexBlockFunction).toHaveBeenCalledTimes(2);
    expect(indexedBlocks).toEqual([1, 2]);
  });

  it('handles a block unavailable error', async () => {
    const indexedBlocks: number[] = [];

    const unavailableBlocks = [4];

    fetchBlocksFunction = async (height: number): Promise<IBlock<number>> => {
      await delay(0.1);

      if (unavailableBlocks.includes(height)) {
        throw new BlockUnavailableError(`Block ${height} is unavailable`);
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
    };

    indexBlockFunction = jest.fn(async (block: IBlock<number>) => {
      await delay(0.1);
      indexedBlocks.push(block.block);
    });

    // Split over 2 calls to be sent do different workers.
    await blockDispatcher.enqueueBlocks([1, 2, 3, 4, 5], 5);
    await blockDispatcher.enqueueBlocks([6, 7, 8], 8);
    await delay(2);

    // This should flush the blocks after the height where dynamicDs is created
    expect(indexBlockFunction).toHaveBeenCalledTimes(7);
    expect(indexedBlocks).toEqual([1, 2, 3, 5, 6, 7, 8]);
  });

  describe('postProcessBlock', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call storeModelProvider.applyPendingChanges with correct parameters during normal processing', async () => {
      // Arrange
      const header: Header = {
        blockHeight: 100,
        blockHash: '0xhash',
        parentHash: '0xparenthash',
        timestamp: new Date(),
      };

      const processBlockResponse: ProcessBlockResponse = {
        dynamicDsCreated: false,
        reindexBlockHeader: null,
      };

      // Act
      await (blockDispatcher as any).postProcessBlock(header, processBlockResponse);

      // Assert
      expect(storeModelProvider.applyPendingChanges).toHaveBeenCalledWith(
        header.blockHeight,
        true, // !projectService.hasDataSourcesAfterHeight(height)
        storeService.transaction
      );
    });

    it('should call applyPendingChanges correctly when handling a reindex', async () => {
      // Arrange
      const header: Header = {
        blockHeight: 100,
        blockHash: '0xhash',
        parentHash: '0xparenthash',
        timestamp: new Date(),
      };

      const reindexBlockHeader: Header = {
        blockHeight: 90,
        blockHash: '0xoldhash',
        parentHash: '0xoldparenthash',
        timestamp: new Date(),
      };

      const processBlockResponse: ProcessBlockResponse = {
        dynamicDsCreated: false,
        reindexBlockHeader,
      };

      // Mock rewind method to avoid executing the full rewind logic
      (blockDispatcher as any).rewind = jest.fn().mockResolvedValue(undefined);

      // Act
      await (blockDispatcher as any).postProcessBlock(header, processBlockResponse);

      // Assert
      expect(storeModelProvider.applyPendingChanges).toHaveBeenCalledWith(
        header.blockHeight,
        true, // !projectService.hasDataSourcesAfterHeight(height)
        storeService.transaction
      );
    });

    it('should call applyPendingChanges correctly when a dynamic datasource is created', async () => {
      (blockDispatcher as any)._onDynamicDsCreated = jest.fn();

      // Arrange
      const header: Header = {
        blockHeight: 100,
        blockHash: '0xhash',
        parentHash: '0xparenthash',
        timestamp: new Date(),
      };

      const processBlockResponse: ProcessBlockResponse = {
        dynamicDsCreated: true, // Dynamic datasource was created
        reindexBlockHeader: null,
      };

      // Act
      await (blockDispatcher as any).postProcessBlock(header, processBlockResponse);

      // Assert
      expect((blockDispatcher as any)._onDynamicDsCreated).toHaveBeenCalledWith(header.blockHeight);
      expect(storeModelProvider.applyPendingChanges).toHaveBeenCalledWith(
        header.blockHeight,
        true,
        storeService.transaction
      );
    });

    it('should call _onDynamicDsCreated when dynamic datasource is created', async () => {
      dynamicDsCreatedBlock = [7];
      const onDynamicDsCreatedSpy = jest.spyOn(blockDispatcher as any, '_onDynamicDsCreated');
      await blockDispatcher.enqueueBlocks([7], 7);
      await blockDispatcher.enqueueBlocks([8], 8);
      await delay(2);

      const queueName = blockDispatcher instanceof BlockDispatcher ? 'Process' : 'Fetch';
      expect(onDynamicDsCreatedSpy).toHaveBeenCalledWith(7);
      expect(isTaskFlushedError).toHaveBeenCalledWith(new TaskFlushedError(queueName));
    });
  });

  describe('Multi chain rewind', () => {
    beforeEach(() => {
      multichainRewindService.waitRewindHeader = {
        blockHeight: 10,
        blockHash: '0xhash',
        parentHash: '0xparenthash',
        timestamp: new Date(),
      };
      jest.clearAllMocks();
    });
    afterAll(() => {
      multichainRewindService.waitRewindHeader = undefined;
    });
    it('Data before the rollback height is reached can be written normally', async () => {
      await blockDispatcher.enqueueBlocks([7, 8, 9], 9);
      await delay(2);
      expect(projectService.reindex).toHaveBeenCalledTimes(0);

      await blockDispatcher.enqueueBlocks([10], 10);
      await delay(2);
      expect(projectService.reindex).toHaveBeenCalledWith(multichainRewindService.waitRewindHeader);
    });
  });
});
