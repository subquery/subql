// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiService } from './api.service';
import { FetchService } from './fetch.service';
import { createCachedProvider } from './x-provider/cachedProvider';

const WS_POLKADOT_ENDPOINT = 'wss://polkadot.api.onfinality.io/public-ws';

describe('FetchService2', () => {
  let fetchService: FetchService;
  let api: ApiPromise;

  beforeAll(async () => {
    api = await ApiPromise.create({
      provider: createCachedProvider(new WsProvider(WS_POLKADOT_ENDPOINT)),
    });

    const apiService = {
      unsafeApi: api,
    } as any as ApiService;

    fetchService = new FetchService(
      apiService, // ApiService
      null, // NodeConfig
      null, // ProjectService
      {} as any, // Project
      null, // BlockDispatcher,
      null, // DictionaryService
      null, // DsProcessorService
      null, // DynamicDsService
      {
        registerFinalizedBlock: () => {
          /* Nothing */
        },
      } as any, // UnfinalizedBlocks
      null, // EventEmitter
      null, // SchedulerRegistry
      null, // RuntimeService
    ) as any;
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it('can get the finalized height', async () => {
    const height = await (fetchService as any).getFinalizedHeight();
    expect(height).toBeGreaterThan(0);
  });

  it('can get the best height', async () => {
    const height = await (fetchService as any).getBestHeight();
    expect(height).toBeGreaterThan(0);
  });

  it('can get the chain interval', async () => {
    const interval = await (fetchService as any).getChainInterval();
    expect(interval).toEqual(5000);
  });
});
