// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { assert } from '@polkadot/util/index';
import { take } from 'rxjs/operators';
import {
  fetchBlocks,
  fetchBlocksViaRangeQuery,
  prefetchMetadata,
} from './substrate';

const endpoint = 'wss://polkadot.api.onfinality.io/public-ws';

jest.setTimeout(100000);

describe('substrate utils', () => {
  let api: ApiPromise;
  beforeAll(async () => {
    const provider = new WsProvider(endpoint);
    api = await ApiPromise.create({ provider });
  });

  it('query range of blocks', async () => {
    const blockHash = await api.rpc.chain.getBlockHash(100000);
    await prefetchMetadata(api, blockHash);
    const blocks = await fetchBlocks(api, 100000, 100019);
    expect(blocks).toHaveLength(20);
    for (const block of blocks) {
      expect(block).toHaveProperty('block');
      expect(block).toHaveProperty('extrinsics');
      expect(block).toHaveProperty('events');
    }
  });

  //skip until https://github.com/polkadot-js/api/issues/4111 resolved
  it.skip('when failed to fetch, log block height and re-throw error', async () => {
    //some large number of block height
    await expect(fetchBlocks(api, 100000000, 100000019)).rejects.toThrow(
      /Unable to retrieve header and parent from supplied hash/,
    );
  });

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
  });
});
