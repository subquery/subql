// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { range } from 'lodash';
import { NodeConfig } from '../configure/NodeConfig';
import { fetchBlocks } from '../utils/substrate';
import { ApiService } from './api.service';
import { FetchService } from './fetch.service';

jest.mock('../utils/substrate', () =>
  jest.createMockFromModule('../utils/substrate'),
);

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

describe('FetchService', () => {
  it('get finalized head when reconnect', async () => {
    const apiService = mockApiService();
    let cb;
    (apiService.getApi().on as jest.Mock).mockImplementation(
      (evt, c) => (cb = c),
    );
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '' }),
      new EventEmitter2(),
    );
    await fetchService.init();
    expect(
      apiService.getApi().rpc.chain.getFinalizedHead,
    ).toHaveBeenCalledTimes(1);
    await cb('connected');
    expect(apiService.getApi().rpc.chain.getBlock).toHaveBeenCalledTimes(2);
  });

  it('loop until shutdown', async () => {
    const apiService = mockApiService();
    (fetchBlocks as jest.Mock).mockImplementation((api, start, end) =>
      range(start, end + 1).map((height) => ({
        block: { block: { header: { number: { toNumber: () => height } } } },
      })),
    );
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '' }),
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
  });

  it('load batchSize of blocks', () => {
    const apiService = mockApiService();
    const batchSize = 50;
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
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
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
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
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
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
