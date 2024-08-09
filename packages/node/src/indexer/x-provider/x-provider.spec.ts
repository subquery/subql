// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { WsProvider } from '@polkadot/rpc-provider';
import { delay } from '@subql/common';
import { createCachedProvider } from './cachedProvider';
import { HttpProvider } from './http';

const TEST_BLOCKHASH =
  '0x3b712c10ba98c5421a468d1411c94479381be307b7ecb5b2602cf0d395eb4292';

describe('ApiPromiseConnection', () => {
  let wsProvider: WsProvider;
  let httpProvider: HttpProvider;

  beforeEach(async () => {
    const ws = await new WsProvider('wss://kusama.api.onfinality.io/public-ws')
      .isReady;
    const http = new HttpProvider('https://kusama.api.onfinality.io/public');

    wsProvider = createCachedProvider(ws);
    httpProvider = createCachedProvider(http);

    // TODO these don't work any more because the send method gets replaced
    jest.spyOn(ws, 'send');
    jest.spyOn(http, 'send');
  });

  afterEach(async () => {
    await Promise.all([wsProvider?.disconnect(), httpProvider?.disconnect()]);
  });

  it('should not make duplicate requests for state_getRuntimeVersion on wsProvider', async () => {
    await Promise.all([
      wsProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
      wsProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
    ]);

    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on wsProvider', async () => {
    await Promise.all([
      wsProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
      wsProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
    ]);
    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for state_getRuntimeVersion on httpProvider', async () => {
    await Promise.all([
      httpProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
      httpProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]),
    ]);
    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on httpProvider', async () => {
    await Promise.all([
      httpProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
      httpProvider.send('chain_getHeader', [TEST_BLOCKHASH]),
    ]);
    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not cache requests if there are no args', async () => {
    const result1 = await httpProvider.send('chain_getHeader', []);
    // Enough time for a new block
    await delay(7);
    const result2 = await httpProvider.send('chain_getHeader', []);

    expect(httpProvider.send).toHaveBeenCalledTimes(2);
    expect(result1).not.toEqual(result2);
  }, 10000);
});
