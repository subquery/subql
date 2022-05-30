// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import {
  fetchBlocks,
  fetchBlocksBatches,
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

  afterAll(() => api?.disconnect());

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

  it('Can codec block', async () => {
    // const provider = new WsProvider('');
    // const api2 = await ApiPromise.create({ provider });


    console.time('Fetch blocks');
    const [block] = await fetchBlocksBatches(api, [8197766]);
    console.timeEnd('Fetch blocks');


    console.time("Encoding Block hex");
    const blockRaw = { type: block.block.toRawType(), data: block.block.toHex() };
    console.timeEnd("Encoding Block hex");

    console.time("Encoding Block u8a");
    const blockRawU8a = { type: block.block.toRawType(), data: block.block.toU8a() };
    console.timeEnd("Encoding Block u8a");


    console.time('Decoding block');
    const newBlock = api
      .registry
      .createType(blockRaw.type, blockRaw.data) as typeof block.block;
    console.timeEnd('Decoding block');

    console.time('Decoding block u8a');
    const newBlockU8a = api
      .registry
      .createType(blockRawU8a.type, blockRawU8a.data) as typeof block.block;
    console.timeEnd('Decoding block u8a');

    // console.log('XXXX new block', newBlock);

    expect(block.block.toJSON()).toEqual(newBlock.toJSON());

  })
});
