// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
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
      },
    },
    on: jest.fn(),
  };
  return {
    getApi: () => mockApi,
  } as any;
}

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    types: {
      TestType: 'u32',
    },
  };
  project.dataSources = [];
  return project;
}

describe('FetchService', () => {
  it('get finalized head when reconnect', async () => {
    const apiService = mockApiService();
    const dictionaryService = new DictionaryService();
    const project = testSubqueryProject();

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
    const dictionaryService = new DictionaryService();
    const project = testSubqueryProject();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '' }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    await fetchService.init();
  });

  it('load batchSize of blocks', () => {
    const apiService = mockApiService();
    const batchSize = 50;
    const dictionaryService = new DictionaryService();
    const project = testSubqueryProject();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    let [start, end] = (fetchService as any).nextBlockRange(100);
    expect(start).toEqual(100);
    expect(end).toEqual(100 + batchSize - 1);

    (fetchService as any).latestPreparedHeight = 129;
    (fetchService as any).latestProcessedHeight = 100;
    [start, end] = (fetchService as any).nextBlockRange(100);
    expect(start).toEqual(130);
    expect(end).toEqual(130 + batchSize - 1);
  });

  it('skip load more if has preloaded enough', () => {
    const apiService = mockApiService();
    const batchSize = 50; // preload = 50*2 = 100
    const dictionaryService = new DictionaryService();
    const project = testSubqueryProject();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    (fetchService as any).latestPreparedHeight = 200;
    (fetchService as any).latestProcessedHeight = 100;
    expect((fetchService as any).nextBlockRange(0)).toBeUndefined();
  });

  it('skip load more if prepared height >= finalized height', () => {
    const apiService = mockApiService();
    const batchSize = 50; // preload = 50*2 = 100
    const dictionaryService = new DictionaryService();
    const project = testSubqueryProject();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    (fetchService as any).latestFinalizedHeight = 1000;
    (fetchService as any).latestPreparedHeight = undefined;
    (fetchService as any).latestProcessedHeight = undefined;
    expect((fetchService as any).nextBlockRange(1001)).toBeUndefined();
    (fetchService as any).latestFinalizedHeight = 1000;
    (fetchService as any).latestPreparedHeight = 1000;
    (fetchService as any).latestProcessedHeight = 1000;
    expect((fetchService as any).nextBlockRange(0)).toBeUndefined();
  });
});
