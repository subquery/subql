// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import {
  IndexerEvent,
  NodeConfig,
  Dictionary,
  SmartBatchService,
  StoreService,
  StoreCacheService,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { difference, range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { calcInterval, fetchBlocksBatches } from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockDispatcherService } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { RuntimeService } from './runtime/runtimeService';
import { BlockContent } from './types';
import {
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

jest.mock('../utils/substrate', () =>
  jest.createMockFromModule('../utils/substrate'),
);

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
  dictionaryTimeout: 10,
});

function mockRejectedApiService(): ApiService {
  const mockApi = {
    rpc: {
      chain: {
        getFinalizedHead: jest.fn(() => `0x112344`),
        getBlock: jest.fn(() => Promise.reject('some error')),
      },
    },
    on: jest.fn(),
  };
  return {
    get api() {
      return mockApi;
    },
  } as any;
}

function mockIndexerManager(): IndexerManager & {
  register: (handler: IndexerManager['indexBlock']) => void;
} {
  let _fn: any;

  return {
    register: (fn) => (_fn = fn),
    indexBlock: (block: BlockContent, runtimeVersion: RuntimeVersion) => {
      _fn?.(block, runtimeVersion);

      return Promise.resolve({ dynamicDsCreated: false });
    },
  } as any;
}

function mockApiService(): ApiService {
  const mockApi = {
    consts: {
      babe: {
        epochDuration: 0x0000000000000960,
        expectedBlockTime: 0x0000000000001770,
        maxAuthorities: 0x000186a0,
      },
      timestamp: {
        minimumPeriod: 0x0000000000000bb8,
      },
    },
    query: {
      parachainSystem: undefined,
    },
    rpc: {
      state: {
        getRuntimeVersion: jest.fn(() => {
          return {
            specVersion: {
              toNumber: jest.fn(() => 12),
            },
          };
        }),
      },
      chain: {
        getFinalizedHead: jest.fn(() => `0x112344`),
        getBlock: jest.fn(() => {
          return {
            block: {
              header: {
                number: {
                  toNumber: jest.fn(() => {
                    return 256;
                  }),
                },
              },
            },
          };
        }),
        getHeader: jest.fn(() => {
          return {
            number: { toNumber: () => 112344 },
            hash: { toHex: () => `0x112344` },
          };
        }),
        getBlockHash: jest.fn(() => `0x123456`),
      },
    },
    on: jest.fn(),
    runtimeChain: {
      toString: jest.fn(() => `Polkadot`),
    },
    runtimeVersion: {
      specName: {
        toString: jest.fn(() => `polkadot`),
      },
    },
    genesisHash: {
      toString: jest.fn(() => `0x12345`),
    },
  };
  return {
    get api() {
      return mockApi;
    },
    fetchBlocks: (batch: number[], specVer?: number) =>
      fetchBlocksBatches(mockApi as any, batch, specVer),
  } as any;
}

const mockDictionaryRet: Dictionary = {
  _metadata: {
    lastProcessedHeight: 998,
    lastProcessedTimestamp: 123124151,
    targetHeight: 998,
    chain: 'Polkadot',
    specName: 'polkadot',
    genesisHash: '0x12345',
    indexerHealthy: true,
    indexerNodeVersion: '0.16.1',
    queryNodeVersion: '0.6.0',
    rowCountEstimate: [{ table: '', estimate: 0 }],
  },
  //simulate after last process height update to 1000
  batchBlocks: [1000],
};

const mockDictionaryNoBatches: Dictionary = {
  _metadata: {
    lastProcessedHeight: 15000,
    lastProcessedTimestamp: 123124151,
    targetHeight: 16000,
    chain: 'Polkadot',
    specName: 'polkadot',
    genesisHash: '0x12345',
    indexerHealthy: true,
    indexerNodeVersion: '0.16.1',
    queryNodeVersion: '0.6.0',
    rowCountEstimate: [{ table: '', estimate: 0 }],
  },
  batchBlocks: [],
};

const mockDictionaryBatches: Dictionary = {
  _metadata: {
    lastProcessedHeight: 15000,
    lastProcessedTimestamp: 123124151,
    targetHeight: 16000,
    chain: 'Polkadot',
    specName: 'polkadot',
    genesisHash: '0x12345',
    indexerHealthy: true,
    indexerNodeVersion: '0.16.1',
    queryNodeVersion: '0.6.0',
    rowCountEstimate: [{ table: '', estimate: 0 }],
  },
  batchBlocks: [14000, 14200, 14300, 14500, 14600, 14700, 14800, 14900],
};

const mockDictionarySpecVersions = {
  _metadata: {
    lastProcessedHeight: 15000,
    lastProcessedTimestamp: 123124151,
    targetHeight: 16000,
    chain: 'Polkadot',
    specName: 'polkadot',
    genesisHash: '0x12345',
    indexerHealthy: true,
    indexerNodeVersion: '0.16.1',
    queryNodeVersion: '0.6.0',
    rowCountEstimate: [{ table: '', estimate: 0 }],
  },
  specVersions: {
    nodes: [
      { id: '0', blockHeight: 1 },
      { id: '1', blockHeight: 29232 },
      { id: '5', blockHeight: 188837 },
      { id: '6', blockHeight: 199406 },
      { id: '7', blockHeight: 214265 },
      { id: '8', blockHeight: 244359 },
      { id: '9', blockHeight: 303080 },
      { id: '10', blockHeight: 314202 },
      { id: '11', blockHeight: 342401 },
      { id: '12', blockHeight: 443964 },
      { id: '13', blockHeight: 528471 },
      { id: '14', blockHeight: 687752 },
      { id: '15', blockHeight: 746086 },
    ],
  },
};

function mockDictionaryService(
  cb?: (mock: jest.Mock) => void,
): DictionaryService {
  const mockDictionary = jest.fn(() => {
    if (cb) {
      cb(mockDictionary);
    }
    return mockDictionaryRet;
  });
  return {
    getDictionary: mockDictionary,
    getSpecVersions: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
    getSpecVersionsRaw: jest.fn(() => mockDictionarySpecVersions),
    buildDictionaryEntryMap: jest.fn(),
    getDictionaryQueryEntries: jest.fn(() => [{}, {}, {}]),
    scopedDictionaryEntries: jest.fn(() => mockDictionaryNoBatches),
  } as any;
}

function mockDictionaryService1(): DictionaryService {
  return {
    startHeight: 0,
    getDictionary: jest.fn(() => mockDictionaryBatches),
    getSpecVersions: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
    getSpecVersionsRaw: jest.fn(() => mockDictionarySpecVersions),
    buildDictionaryEntryMap: jest.fn(),
    getDictionaryQueryEntries: jest.fn(() => [{}, {}]),
    scopedDictionaryEntries: jest.fn(() => mockDictionaryBatches),
    getMetadata: jest.fn(() => ({
      _metadata: {
        startHeight: 0,
        lastProcessedHeight: 1500000,
        genesisHash: '0x12345',
      },
    })),
    parseSpecVersions: jest.fn(() => []),
  } as any;
}

function mockDictionaryService2(): DictionaryService {
  return {
    getDictionary: jest.fn(() => undefined),
    buildDictionaryEntryMap: jest.fn(),
    getSpecVersions: jest.fn(() => mockDictionarySpecVersions),
    getDictionaryQueryEntries: jest.fn(() => []),
  } as any;
}

function mockDictionaryService3(): DictionaryService {
  return {
    startHeight: 0,
    getDictionary: jest.fn(() => mockDictionaryNoBatches),
    getSpecVersions: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
    getSpecVersionsRaw: jest.fn(() => mockDictionarySpecVersions),
    buildDictionaryEntryMap: jest.fn(),
    scopedDictionaryEntries: jest.fn(() => mockDictionaryNoBatches),
    getDictionaryQueryEntries: jest.fn(() => [{}, {}]),
    getMetadata: jest.fn(() => ({
      _metadata: {
        startHeight: 0,
        lastProcessedHeight: 1500000,
        genesisHash: '0x12345',
      },
    })),
    parseSpecVersions: jest.fn(() => []),
  } as any;
}

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      chainId: '0x',
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
    },
    chainTypes: {
      types: {
        TestType: 'u32',
      },
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

function testSubqueryProjectV0_2_0(): SubqueryProject {
  return {
    network: {
      chainId: '0x',
      endpoint: [],
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
    },
    dataSources: [
      {
        kind: 'substrate/Jsonfy',
        processor: {
          file: 'test/jsonfy.js',
        },
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: 'substrate/JsonfyEvent',
            },
          ],
        },
      },
    ] as any,
    id: 'test',
    schema: new GraphQLSchema({}),
    root: path.resolve(__dirname, '../../'),
    templates: [],
  };
}

function mockProjectService(project: SubqueryProject): ProjectService {
  return {
    blockOffset: 1,
    getProcessedBlockCount: jest.fn(() => Promise.resolve(0)),
    upsertMetadataBlockOffset: jest.fn(),
    setBlockOffset: jest.fn(),
    getAllDataSources: () => project.dataSources,
  } as any;
}

function mockStoreService(): StoreService {
  return {
    setOperationStack: () => {
      /* nothing */
    },
    setBlockHeight: (height: number) => {
      /* nothing */
    },
    getOperationMerkleRoot: () => {
      return null;
    },
  } as unknown as StoreService;
}

function mockStoreCache(): StoreCacheService {
  return {
    metadata: {
      set: (key: string, value: any) => {
        /* nothing */
      },
      // eslint-disable-next-line @typescript-eslint/require-await
      find: async (key: string) => {
        switch (key) {
          case METADATA_UNFINALIZED_BLOCKS_KEY:
            return '[]';

          default:
            return undefined;
        }
      },
      setBulk: (data: any[]) => {
        /* nothing */
      },
      setIncrement: (key: string) => {
        /* nothing */
      },
    },
    flushCache: () => Promise.resolve(),
  } as StoreCacheService;
}

async function createFetchService(
  apiService = mockApiService(),
  indexerManager: IndexerManager,
  dictionaryService: DictionaryService,
  project: SubqueryProject,
  batchSize?: number,
  config?: NodeConfig,
): Promise<FetchService> {
  const dsProcessorService = new DsProcessorService(project, config);
  const projectService = mockProjectService(project);
  const storeCache = mockStoreCache();
  const dynamicDsService = new DynamicDsService(dsProcessorService, project);
  (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
  const nodeConfig = new NodeConfig({
    subquery: '',
    subqueryName: '',
    batchSize,
  });
  const unfinalizedBlocksService = new UnfinalizedBlocksService(
    apiService,
    nodeConfig,
    storeCache,
  );
  await unfinalizedBlocksService.init(() => Promise.resolve());
  const eventEmitter = new EventEmitter2();

  return new FetchService(
    apiService,
    nodeConfig,
    project,
    new BlockDispatcherService(
      apiService,
      nodeConfig,
      indexerManager,
      eventEmitter,
      projectService,
      new SmartBatchService(nodeConfig.batchSize),
      mockStoreService(),
      storeCache,
      null, // POI
      project,
      dynamicDsService,
    ),
    dictionaryService,
    dsProcessorService,
    dynamicDsService,
    unfinalizedBlocksService,
    eventEmitter,
    new SchedulerRegistry(),
    new RuntimeService(apiService, dictionaryService),
  );
}

describe('FetchService', () => {
  let apiService: ApiService;
  let project: SubqueryProject;
  let fetchService: FetchService;
  let config: NodeConfig;

  beforeEach(() => {
    apiService = mockApiService();
    project = testSubqueryProject();
    (fetchBlocksBatches as jest.Mock).mockImplementation((api, blockArray) =>
      blockArray.map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
    (calcInterval as jest.Mock).mockImplementation((api) => new BN(7_000));
  });

  afterEach(() => {
    (fetchService as unknown as any)?.blockDispatcher?.onApplicationShutdown();
    fetchService?.onApplicationShutdown();
  });

  it('get finalized head when reconnect', async () => {
    fetchService = await createFetchService(
      apiService,
      mockIndexerManager(),
      new DictionaryService(project, nodeConfig),
      project,
    );
    const pendingInit = fetchService.init(1);
    expect(apiService.api.rpc.chain.getFinalizedHead).toHaveBeenCalledTimes(1);
    expect(apiService.api.rpc.chain.getHeader).toHaveBeenCalledTimes(1);
    await pendingInit;
    fetchService.onApplicationShutdown();
  });

  // This doesn't test anything
  it.skip('log errors when failed to get finalized block', async () => {
    fetchService = await createFetchService(
      mockRejectedApiService(),
      mockIndexerManager(),
      new DictionaryService(project, nodeConfig),
      project,
    );
    await fetchService.init(1);
  });

  it('load batchSize of blocks with original method', async () => {
    const batchSize = 50;
    const dictionaryService = new DictionaryService(project, nodeConfig);

    fetchService = await createFetchService(
      apiService,
      mockIndexerManager(),
      dictionaryService,
      project,
      batchSize,
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    (fetchService as any).unfinalizedBlocksService.registerFinalizedBlock({
      number: { toNumber: () => 1000 },
      hash: { toHex: () => '0xabcd' },
    });
    (fetchService as any).latestBestHeight = 1020;
    (fetchService as any).unfinalizedBlocksService.registerUnfinalizedBlock(
      1020,
      '0x1234',
    );
    const end = await (fetchService as any).nextEndBlockHeight(100, batchSize);
    expect(end).toEqual(100 + batchSize - 1);
  });

  it('loop until shutdown', async () => {
    const batchSize = 20;
    (fetchBlocksBatches as jest.Mock).mockImplementation((api, blockArray) =>
      blockArray.map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
    const dictionaryService = new DictionaryService(project, nodeConfig);

    const indexerManager = mockIndexerManager();

    fetchService = await createFetchService(
      apiService,
      indexerManager,
      dictionaryService,
      project,
      batchSize,
    );

    (fetchService as any).runtimeService.prefetchMeta = jest.fn();

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 10) {
          fetchService.onApplicationShutdown();
          (fetchService as any).blockDispatcher.onApplicationShutdown();
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          blockHash: '0x',
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(1);
    await pendingCondition;

    fetchService.onApplicationShutdown();
  }, 500000);

  // skip this test, we are using dictionaryValidation method with startHeight, rather than use local useDictionary
  it.skip("skip use dictionary once if dictionary 's lastProcessedHeight < startBlockHeight", async () => {
    const batchSize = 20;
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleCall',
              kind: SubstrateHandlerKind.Call,
              filter: {
                module: 'utility',
                method: 'batchAll',
              },
            },
          ],
        },
      },
    ];
    const dictionaryService = mockDictionaryService((mock) => {
      mockDictionaryRet._metadata.lastProcessedHeight++;
    });
    const projectService = mockProjectService(project);
    const storeCache = mockStoreCache();
    const eventEmitter = new EventEmitter2();
    const schedulerRegistry = new SchedulerRegistry();
    const dsProcessorService = new DsProcessorService(project, config);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
    const nodeConfig = new NodeConfig({
      subquery: '',
      subqueryName: '',
      batchSize,
    });
    const unfinalizedBlocksService = new UnfinalizedBlocksService(
      apiService,
      nodeConfig,
      storeCache,
    );

    await unfinalizedBlocksService.init(() => Promise.resolve());
    const blockDispatcher = new BlockDispatcherService(
      apiService,
      nodeConfig,
      mockIndexerManager(),
      eventEmitter,
      projectService,
      new SmartBatchService(nodeConfig.batchSize),
      mockStoreService(),
      storeCache,
      null, // POI
      project,
      dynamicDsService,
    );
    fetchService = new FetchService(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      eventEmitter,
      schedulerRegistry,
      new RuntimeService(apiService, dictionaryService),
    );

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init(1000);

    (fetchService as any).latestFinalizedHeight = 1005;
    blockDispatcher.latestBufferedHeight = undefined;
    // (fetchService as any).latestProcessedHeight = undefined;
    // const loopPromise = fetchService.startLoop(1000);
    await new Promise((resolve) => {
      eventEmitter.on(IndexerEvent.BlocknumberQueueSize, (nextBufferSize) => {
        // [1000,1001,1002,1003,1004]
        if (nextBufferSize.value >= 5) {
          resolve(undefined);
        }
      });
    });

    expect(dictionaryValidationSpy).toHaveBeenCalledTimes(1);
    expect(nextEndBlockHeightSpy).toHaveBeenCalledTimes(1);
    //we expect after use the original method, next loop will still use dictionary by default
    expect((fetchService as any).useDictionary).toBeTruthy();
  }, 500000);

  it('set last buffered Height to dictionary last processed height when dictionary returned batch is empty, and then start use original method', async () => {
    const batchSize = 20;
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleBond',
              kind: SubstrateHandlerKind.Event,
              filter: {
                module: 'staking',
                method: 'Bonded',
              },
            },
          ],
        },
      },
    ];
    const dictionaryService = mockDictionaryService3();
    const projectService = mockProjectService(project);
    const storeCache = mockStoreCache();
    const schedulerRegistry = new SchedulerRegistry();
    const eventEmitter = new EventEmitter2();
    const dsProcessorService = new DsProcessorService(project, config);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
    const nodeConfig = new NodeConfig({
      subquery: '',
      subqueryName: '',
      batchSize,
    });
    const unfinalizedBlocksService = new UnfinalizedBlocksService(
      apiService,
      nodeConfig,
      storeCache,
    );
    await unfinalizedBlocksService.init(() => Promise.resolve());

    const blockDispatcher = new BlockDispatcherService(
      apiService,
      nodeConfig,
      mockIndexerManager(),
      eventEmitter,
      projectService,
      new SmartBatchService(nodeConfig.batchSize),
      mockStoreService(),
      storeCache,
      null, // POI
      project,
      dynamicDsService,
    );
    fetchService = new FetchService(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      eventEmitter,
      schedulerRegistry,
      new RuntimeService(apiService, dictionaryService),
    );
    await fetchService.init(1000);
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );

    (fetchService as any).latestFinalizedHeight = 16000;
    const runtimeService = (fetchService as any).runtimeService;
    runtimeService.prefetchMeta = jest.fn();
    blockDispatcher.latestBufferedHeight = undefined;
    // (fetchService as any).latestProcessedHeight = undefined;
    // const loopPromise = fetchService.startLoop(1000);
    await new Promise((resolve) => {
      eventEmitter.on(IndexerEvent.BlocknumberQueueSize, (nextBufferSize) => {
        if (nextBufferSize.value >= 5) {
          resolve(undefined);
        }
      });
    });
    // await loopPromise;
    expect(nextEndBlockHeightSpy).toHaveBeenCalledTimes(1);
    // lastProcessed height (use dictionary once) + batchsize (use original once)
    expect(blockDispatcher.latestBufferedHeight).toBe(15020);
  }, 500000);

  it('fill the dictionary returned batches to nextBlockBuffer', async () => {
    const batchSize = 20;
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: ' ',
          handlers: [
            {
              handler: 'handleBond',
              kind: SubstrateHandlerKind.Event,
              filter: {
                module: 'staking',
                method: 'Bonded',
              },
            },
          ],
        },
      },
    ];
    const dictionaryService = mockDictionaryService1();
    const projectService = mockProjectService(project);
    const storeCache = mockStoreCache();
    const schedulerRegistry = new SchedulerRegistry();
    const dsProcessorService = new DsProcessorService(project, config);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
    const eventEmitter = new EventEmitter2();
    const nodeConfig = new NodeConfig({
      subquery: '',
      subqueryName: '',
      batchSize,
    });
    const unfinalizedBlocksService = new UnfinalizedBlocksService(
      apiService,
      nodeConfig,
      storeCache,
    );
    await unfinalizedBlocksService.init(() => Promise.resolve());
    const blockDispatcher = new BlockDispatcherService(
      apiService,
      nodeConfig,
      mockIndexerManager(),
      eventEmitter,
      projectService,
      new SmartBatchService(nodeConfig.batchSize),
      mockStoreService(),
      storeCache,
      null, // POI
      project,
      dynamicDsService,
    );
    fetchService = new FetchService(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      eventEmitter,
      schedulerRegistry,
      new RuntimeService(apiService, dictionaryService),
    );
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    await fetchService.init(1000);
    (fetchService as any).latestFinalizedHeight = 16000;
    blockDispatcher.latestBufferedHeight = undefined;
    // (fetchService as any).latestProcessedHeight = undefined;
    // const loopPromise = fetchService.startLoop(1000);
    await new Promise((resolve) => {
      eventEmitter.on(IndexerEvent.BlocknumberQueueSize, (nextBufferSize) => {
        if (nextBufferSize.value >= 8) {
          resolve(undefined);
        }
      });
    });
    // await loopPromise;
    expect(nextEndBlockHeightSpy).toBeCalledTimes(0);
    //alway use dictionary
    expect((fetchService as any).useDictionary).toBeTruthy();
    expect(blockDispatcher.latestBufferedHeight).toBe(14900);
  }, 500000);

  it('can support custom data sources', async () => {
    project = testSubqueryProjectV0_2_0();

    const indexerManager = mockIndexerManager();

    fetchService = await createFetchService(
      apiService,
      indexerManager,
      new DictionaryService(project, nodeConfig),
      project,
      20,
      nodeConfig,
    );

    const baseHandlerFilters = jest.spyOn(
      fetchService as any,
      `getBaseHandlerFilters`,
    );

    const getDsProcessor = jest.spyOn(
      (fetchService as any).dsProcessorService,
      `getDsProcessor`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 10) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          blockHash: '0x',
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(1);

    await pendingCondition;

    // const loopPromise = fetchService.startLoop(1);
    // void fetchService.register(async (content) => {
    //   if (content.block.block.header.number.toNumber() === 10) {
    //     fetchService.onApplicationShutdown();
    //   }
    // });
    // await loopPromise;

    expect(baseHandlerFilters).toHaveBeenCalledTimes(1);
    expect(getDsProcessor).toHaveBeenCalledTimes(3);
    fetchService.onApplicationShutdown();
  }, 500000);
  it('given bypassBlocks, should return correct output during runtime', async () => {
    const batchSize = 20;
    project.network.bypassBlocks = ['1 - 22', 35, 44, 40, 80];
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleBond',
              kind: SubstrateHandlerKind.Block,
            },
          ],
        },
      },
    ];
    const nodeConfig = new NodeConfig({
      subquery: '',
      subqueryName: '',
      batchSize,
    });

    const dictionaryService = new DictionaryService(project, nodeConfig);
    const projectService = mockProjectService(project);
    const storeCache = mockStoreCache();
    const schedulerRegistry = new SchedulerRegistry();
    const eventEmitter = new EventEmitter2();
    const dsProcessorService = new DsProcessorService(project, nodeConfig);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);

    const unfinalizedBlocksService = new UnfinalizedBlocksService(
      apiService,
      nodeConfig,
      storeCache,
    );
    await unfinalizedBlocksService.init(() => Promise.resolve());

    const blockDispatcher = new BlockDispatcherService(
      apiService,
      nodeConfig,
      mockIndexerManager(),
      eventEmitter,
      projectService,
      new SmartBatchService(nodeConfig.batchSize),
      mockStoreService(),
      storeCache,
      null, // POI
      project,
      dynamicDsService,
    );
    fetchService = new FetchService(
      apiService,
      nodeConfig,
      project,
      blockDispatcher,
      dictionaryService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      eventEmitter,
      schedulerRegistry,
      new RuntimeService(apiService, dictionaryService),
    );
    await fetchService.init(1);
    const filteredBatch = jest.spyOn(fetchService as any, `filteredBlockBatch`);
    (fetchService as any).latestFinalizedHeight = 80;
    blockDispatcher.latestBufferedHeight = undefined;
    await new Promise((resolve) => {
      eventEmitter.on(IndexerEvent.BlocknumberQueueSize, (nextBufferSize) => {
        if (nextBufferSize.value >= 8) {
          resolve(undefined);
        }
      });
    });
    // Looped twice
    expect(filteredBatch.mock.results[0].value).toEqual([]);
    expect(
      difference(range(21, 40 + 1), filteredBatch.mock.results[1].value),
    ).toEqual([21, 22, 35, 40]);
    expect((fetchService as any).bypassBlocks).toEqual([44, 40, 80]);
  }, 500000);
});
