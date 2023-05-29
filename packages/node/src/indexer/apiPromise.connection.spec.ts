// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { WsProvider, HttpProvider } from '@polkadot/rpc-provider';
import { ApiPromiseConnection } from './apiPromise.connection';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');
const RETRY_DELAY = 2_500;

const TEST_BLOCKHASH =
  '0x3b712c10ba98c5421a468d1411c94479381be307b7ecb5b2602cf0d395eb4292';

describe('ApiPromiseConnection', () => {
  let wsProvider;
  let httpProvider;

  beforeEach(() => {
    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    wsProvider = new WsProvider(
      'wss://kusama.api.onfinality.io/public-ws',
      RETRY_DELAY,
      headers,
    );
    httpProvider = new HttpProvider('https://kusama.api.onfinality.io/public');

    jest.spyOn(wsProvider, 'send');
    jest.spyOn(httpProvider, 'send');
  });

  afterEach(async () => {
    if (wsProvider.isConnected) {
      await wsProvider.disconnect();
    }
  });

  it('should not make duplicate requests for state_getRuntimeVersion on wsProvider', async () => {
    const cachedProvider =
      ApiPromiseConnection.createCachedProvider(wsProvider);

    await cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]);
    await cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]);

    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on wsProvider', async () => {
    const cachedProvider =
      ApiPromiseConnection.createCachedProvider(wsProvider);

    await cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]);
    await cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]);

    expect(wsProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for state_getRuntimeVersion on httpProvider', async () => {
    const cachedProvider =
      ApiPromiseConnection.createCachedProvider(httpProvider);

    await cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]);
    await cachedProvider.send('state_getRuntimeVersion', [TEST_BLOCKHASH]);

    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });

  it('should not make duplicate requests for chain_getHeader on httpProvider', async () => {
    const cachedProvider =
      ApiPromiseConnection.createCachedProvider(httpProvider);

    await cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]);
    await cachedProvider.send('chain_getHeader', [TEST_BLOCKHASH]);

    expect(httpProvider.send).toHaveBeenCalledTimes(1);
  });
});
