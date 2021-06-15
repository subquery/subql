// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import {
  fetchBlocks,
  fetchBlocksViaRangeQuery,
  prefetchMetadata,
} from './substrate';

const endpoint = 'wss://polkadot.api.onfinality.io/public-ws';

describe('substrate utils', () => {
  let api: ApiPromise;
  beforeAll(async () => {
    const provider = new WsProvider(endpoint);
    api = await ApiPromise.create({ provider });
  });

  it('query range of blocks', async () => {
    const blockHash = await api.rpc.chain.getBlockHash(1785);
    await prefetchMetadata(api, blockHash);
    const blocks = await fetchBlocks(api, 1785, 1785);
    expect(blocks).toHaveLength(1);
    for (const block of blocks) {
      expect(block).toHaveProperty('block');
      expect(block).toHaveProperty('extrinsics');
      expect(block).toHaveProperty('events');
    }
  }, 30000);

  it.skip('query range of blocks via range query', async () => {
    const blockHash = await api.rpc.chain.getBlockHash(100000);
    await prefetchMetadata(api, blockHash);
    const blocks = await fetchBlocksViaRangeQuery(api, 100000, 100019);
    expect(blocks).toHaveLength(20);
    for (const block of blocks) {
      expect(block).toHaveProperty('block');
      expect(block).toHaveProperty('extrinsics');
      expect(block).toHaveProperty('events');
    }
  }, 30000);
});
