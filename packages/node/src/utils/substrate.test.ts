// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import Cron from 'cron-converter';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { fetchBlocks, filterBlock } from './substrate';

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
    // await prefetchMetadata(api, blockHash);
    const blocks = await fetchBlocks(api, 100000, 100019);
    expect(blocks).toHaveLength(20);
    for (const block of blocks) {
      expect(block).toHaveProperty('block');
      expect(block).toHaveProperty('extrinsics');
      expect(block).toHaveProperty('events');
    }
  });

  it('filters blocks based on timestamp', async () => {
    const cronString = '*/5 * * * *';
    const cron = new Cron();
    cron.fromString(cronString);
    const blocks = await fetchBlocks(api, 100000, 100100);
    const reference = blocks[0].block.timestamp;
    const schedule = cron.schedule(reference);
    const filter: SubqlProjectBlockFilter = {
      timestamp: cronString,
      cronSchedule: {
        schedule: schedule,
        get next() {
          return Date.parse(this.schedule.next().format());
        },
      },
    };
    const filteredBlocks = blocks.filter((block) => {
      return filterBlock(block.block, filter) !== undefined;
    });

    expect(filteredBlocks).toHaveLength(2);
  });

  it.skip('when failed to fetch, log block height and re-throw error', async () => {
    //some large number of block height
    await expect(fetchBlocks(api, 100000000, 100000019)).rejects.toThrow(
      /Unable to retrieve header and parent from supplied hash/,
    );
  });
});
