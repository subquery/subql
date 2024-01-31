// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { WsProvider } from '@polkadot/rpc-provider';
import { delay } from '@subql/common';
import { createCachedProvider } from './x-provider/cachedProvider';
import { HttpProvider } from './x-provider/http';

const TEST_BLOCKHASH =
  '0x3b712c10ba98c5421a468d1411c94479381be307b7ecb5b2602cf0d395eb4292';

describe('ApiPromiseConnection', () => {
  let wsProvider: WsProvider;
  let httpProvider: HttpProvider;

  beforeEach(async () => {
    wsProvider = await new WsProvider(
      'wss://kusama.api.onfinality.io/public-ws',
    ).isReady;
    httpProvider = new HttpProvider('https://kusama.api.onfinality.io/public');

    jest.spyOn(wsProvider, 'send');
    jest.spyOn(httpProvider, 'send');
  });

  it('should not make duplicate requests for state_getRuntimeVersion on wsProvider', async () => {
    const cachedProvider = createCachedProvider(wsProvider);

    await Promise.all([
      cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
      cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
    ]);

    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on wsProvider', async () => {
    const cachedProvider = createCachedProvider(wsProvider);
    await Promise.all([
      cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
      cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
    ]);
    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for state_getRuntimeVersion on httpProvider', async () => {
    const cachedProvider = createCachedProvider(httpProvider);

    await Promise.all([
      cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
      cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
    ]);
    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on httpProvider', async () => {
    const cachedProvider = createCachedProvider(httpProvider);

    await Promise.all([
      cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
      cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
    ]);
    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not cache requests if there are no args', async () => {
    const cachedProvider = createCachedProvider(httpProvider);

    const result1 = await cachedProvider.send('chain_getHeader', []);
    // Enough time for a new block
    await delay(7);
    const result2 = await cachedProvider.send('chain_getHeader', []);

    expect(httpProvider.send).toHaveBeenCalledTimes(2);
    expect(result1).not.toEqual(result2);
  }, 10000);
});
