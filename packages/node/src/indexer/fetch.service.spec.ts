// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectManifestVersioned, SubqlKind } from '@subql/common';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { fetchBlocksBatches } from '../utils/substrate';
import { ApiService } from './api.service';
import { BlockedQueue } from './BlockedQueue';
import { Dictionary, DictionaryService } from './dictionary.service';
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
  } as any;
}

function mockDictionaryService1(): DictionaryService {
  return {
    getDictionary: jest.fn(() => mockDictionaryBatches),
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
  } as any;
}

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.0.1',
      network: {
        endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
        types: {
          TestType: 'u32',
        },
      },
      dataSources: [],
    } as any),
    '',
  );
  return project;
}

describe('FetchService', () => {
  it('get finalized head when reconnect', async () => {
    const apiService = mockApiService();
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '' }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    await fetchService.init();
    expect(
      apiService.getApi().rpc.chain.getFinalizedHead,
    ).toHaveBeenCalledTimes(1);
    expect(apiService.getApi().rpc.chain.getBlock).toHaveBeenCalledTimes(1);
  });

  it('log errors when failed to get finalized block', async () => {
    const apiService = mockRejectedApiService();
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '' }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    await fetchService.init();
  });

  it('load batchSize of blocks with original method', () => {
    const apiService = mockApiService();
    const batchSize = 50;
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    const end = (fetchService as any).nextEndBlockHeight(100);
    expect(end).toEqual(100 + batchSize - 1);
  });

  it('loop until shutdown', async () => {
    const batchSize = 20;
    const apiService = mockApiService();
    (fetchBlocksBatches as jest.Mock).mockImplementation((api, blockArray) =>
      blockArray.map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
    const project = testSubqueryProject();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    fetchService.fetchMeta = jest.fn();
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
    const apiService = mockApiService();
    const batchSize = 20;
    const project = testSubqueryProject();
    project.projectManifest.asV0_0_1.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleCall',
              kind: 'substrate/CallHandler',
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
    const eventEmitter = new EventEmitter2();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
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

  it('skip use dictionary once if getDictionary(api failure) return undefined ', async () => {
    const apiService = mockApiService();
    const batchSize = 20;
    const project = testSubqueryProject();
    project.projectManifest.asV0_0_1.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleBond',
              kind: 'substrate/EventHandler',
              filter: {
                module: 'staking',
                method: 'Bonded',
              },
            },
          ],
        },
      },
    ];
    const dictionaryService = mockDictionaryService2();
    const eventEmitter = new EventEmitter2();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
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
    //validation will not be called as dictionary is undefined
    expect(dictionaryValidationSpy).toHaveBeenCalledTimes(0);
    expect(nextEndBlockHeightSpy).toHaveBeenCalledTimes(1);
    //we expect after use the original method, next loop will still use dictionary by default
    expect((fetchService as any).useDictionary).toBeTruthy();
  }, 500000);

  it('set last buffered Height to dictionary last processed height when dictionary returned batch is empty, and then start use original method', async () => {
    const apiService = mockApiService();
    const batchSize = 20;
    const project = testSubqueryProject();
    project.projectManifest.asV0_0_1.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleBond',
              kind: 'substrate/EventHandler',
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
    const eventEmitter = new EventEmitter2();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      eventEmitter,
    );
    await fetchService.init();
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    fetchService.fetchMeta = jest.fn();
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
    const apiService = mockApiService();
    const batchSize = 20;
    const project = testSubqueryProject();
    project.projectManifest.asV0_0_1.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleBond',
              kind: 'substrate/EventHandler',
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
    const eventEmitter = new EventEmitter2();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
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
});
