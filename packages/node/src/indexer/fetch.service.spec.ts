// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import { GraphQLSchema } from 'graphql';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { fetchBlocksBatches } from '../utils/substrate';
import { ApiService } from './api.service';
import { Dictionary, DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';

jest.mock('../utils/substrate', () =>
  jest.createMockFromModule('../utils/substrate'),
);

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
    getApi: () => mockApi,
  } as any;
}

function mockApiService(): ApiService {
  const mockApi = {
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
    getApi: () => mockApi,
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
    getSpecVersion: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
  } as any;
}

function mockDictionaryService1(): DictionaryService {
  return {
    getDictionary: jest.fn(() => mockDictionaryBatches),
    getSpecVersion: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
  } as any;
}

function mockDictionaryService2(): DictionaryService {
  return {
    getDictionary: jest.fn(() => undefined),
  } as any;
}

function mockDictionaryService3(): DictionaryService {
  return {
    getDictionary: jest.fn(() => mockDictionaryNoBatches),
    getSpecVersion: jest.fn(() => [{ id: '1', start: 1, end: 29231 }]),
  } as any;
}
function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
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
      genesisHash: '0x',
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

function createFetchService(
  apiService = mockApiService(),
  dictionaryService: DictionaryService,
  project: SubqueryProject,
  batchSize?: number,
) {
  const dsProcessorService = new DsProcessorService(project);
  const dynamicDsService = new DynamicDsService(dsProcessorService, project);
  (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
  return new FetchService(
    apiService,
    new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
    project,
    dictionaryService,
    new DsProcessorService(project),
    dynamicDsService,
    new EventEmitter2(),
  );
}

describe('FetchService', () => {
  let apiService: ApiService;
  let project: SubqueryProject;

  beforeEach(() => {
    apiService = mockApiService();
    project = testSubqueryProject();
    (fetchBlocksBatches as jest.Mock).mockImplementation((api, blockArray) =>
      blockArray.map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
  });

  it('get finalized head when reconnect', async () => {
    const fetchService = createFetchService(
      apiService,
      new DictionaryService(project),
      project,
    );
    await fetchService.init();
    expect(
      apiService.getApi().rpc.chain.getFinalizedHead,
    ).toHaveBeenCalledTimes(1);
    expect(apiService.getApi().rpc.chain.getBlock).toHaveBeenCalledTimes(1);
  });

  it('log errors when failed to get finalized block', async () => {
    const fetchService = createFetchService(
      mockRejectedApiService(),
      new DictionaryService(project),
      project,
    );
    await fetchService.init();
  });

  it('load batchSize of blocks with original method', () => {
    const batchSize = 50;
    const dictionaryService = new DictionaryService(project);

    const fetchService = createFetchService(
      apiService,
      dictionaryService,
      project,
      batchSize,
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    const end = (fetchService as any).nextEndBlockHeight(100, batchSize);
    expect(end).toEqual(100 + batchSize - 1);
  });

  it('loop until shutdown', async () => {
    const batchSize = 20;
    (fetchBlocksBatches as jest.Mock).mockImplementation((api, blockArray) =>
      blockArray.map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
    const dictionaryService = new DictionaryService(project);

    const fetchService = createFetchService(
      apiService,
      dictionaryService,
      project,
      batchSize,
    );
    fetchService.prefetchMeta = jest.fn();
    await fetchService.init();
    const loopPromise = fetchService.startLoop(1);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 10) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
  }, 500000);

  it("skip use dictionary once if dictionary 's lastProcessedHeight < startBlockHeight ", async () => {
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
    const dsPluginService = new DsProcessorService(project);
    const eventEmitter = new EventEmitter2();
    const dsProcessorService = new DsProcessorService(project);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      dsPluginService,
      dynamicDsService,
      eventEmitter,
    );

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();
    (fetchService as any).latestFinalizedHeight = 1005;
    (fetchService as any).latestBufferedHeight = undefined;
    (fetchService as any).latestProcessedHeight = undefined;
    const loopPromise = fetchService.startLoop(1000);
    eventEmitter.on(`blocknumber_queue_size`, (nextBufferSize) => {
      // [1000,1001,1002,1003,1004]
      if (nextBufferSize.value >= 5) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
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
    const dsPluginService = new DsProcessorService(project);
    const eventEmitter = new EventEmitter2();
    const dsProcessorService = new DsProcessorService(project);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      dsPluginService,
      dynamicDsService,
      eventEmitter,
    );
    await fetchService.init();
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    fetchService.prefetchMeta = jest.fn();
    (fetchService as any).latestFinalizedHeight = 16000;
    (fetchService as any).latestBufferedHeight = undefined;
    (fetchService as any).latestProcessedHeight = undefined;
    const loopPromise = fetchService.startLoop(1000);
    eventEmitter.on(`blocknumber_queue_size`, (nextBufferSize) => {
      if (nextBufferSize.value >= 5) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(nextEndBlockHeightSpy).toHaveBeenCalledTimes(1);
    // lastProcessed height (use dictionary once) + batchsize (use original once)
    expect((fetchService as any).latestBufferedHeight).toBe(15020);
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
    const dsPluginService = new DsProcessorService(project);
    const dsProcessorService = new DsProcessorService(project);
    const dynamicDsService = new DynamicDsService(dsProcessorService, project);
    (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
    const eventEmitter = new EventEmitter2();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      dsPluginService,
      dynamicDsService,
      eventEmitter,
    );
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    await fetchService.init();
    (fetchService as any).latestFinalizedHeight = 16000;
    (fetchService as any).latestBufferedHeight = undefined;
    (fetchService as any).latestProcessedHeight = undefined;
    const loopPromise = fetchService.startLoop(1000);
    eventEmitter.on(`blocknumber_queue_size`, (nextBufferSize) => {
      if (nextBufferSize.value >= 8) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(nextEndBlockHeightSpy).toBeCalledTimes(0);
    //alway use dictionary
    expect((fetchService as any).useDictionary).toBeTruthy();
    expect((fetchService as any).latestBufferedHeight).toBe(14900);
  }, 500000);

  it('can support custom data sources', async () => {
    project = testSubqueryProjectV0_2_0();

    const fetchService = createFetchService(
      apiService,
      new DictionaryService(project),
      project,
      20,
    );

    const baseHandlerFilters = jest.spyOn(
      fetchService as any,
      `getBaseHandlerFilters`,
    );

    const getDsProcessor = jest.spyOn(
      (fetchService as any).dsProcessorService,
      `getDsProcessor`,
    );

    await fetchService.init();

    const loopPromise = fetchService.startLoop(1);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 10) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;

    expect(baseHandlerFilters).toHaveBeenCalledTimes(1);
    expect(getDsProcessor).toHaveBeenCalledTimes(3);
  }, 500000);
});
