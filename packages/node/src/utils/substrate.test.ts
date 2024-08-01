// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { getLogger } from '@subql/node-core';
import { stringToArray } from 'cron-converter';
import {
  fetchBlocksArray,
  fetchBlocksBatches,
  filterExtrinsic,
  getBlockByHeight,
  getTimestamp,
} from './substrate';

const ENDPOINT_POLKADOT = 'wss://rpc.polkadot.io';
const ENDPOINT_KARURA = 'wss://karura-rpc-0.aca-api.network';
const ENDPOINT_SHIDEN = 'wss://rpc.shiden.astar.network';
jest.setTimeout(100000);

describe('substrate utils', () => {
  let api: ApiPromise;
  beforeAll(async () => {
    const provider = new WsProvider(ENDPOINT_POLKADOT);
    api = await ApiPromise.create({ provider });
  });

  afterAll(() => api?.disconnect());

  it('invalid timestamp throws error on cron creation', () => {
    const cronString = 'invalid cron';
    expect(() => {
      try {
        stringToArray(cronString);
      } catch (e) {
        throw new Error(`invalid cron expression: ${cronString}`);
      }
    }).toThrow(Error);
  });

  // This endpoint was having issue when fetch block 3467086, but fixed now
  // Keep the test for further debugging
  it.skip('validate block hash after fetch', async () => {
    const provider = new WsProvider(ENDPOINT_KARURA);
    const api = await ApiPromise.create({ provider });
    await expect(fetchBlocksArray(api, [3467085, 3467086])).rejects.toThrow(
      'fetched block header hash 0xdcdd89927d8a348e00257e1ecc8617f45edb5118efff3ea2f9961b2ad9b7690a is not match with blockHash 0xd13a656c8c4cd7a6f7d03db8209eee9c597edffba1b7ee2dc40844089e10b21a at block 3467086',
    );
    // This test creates another api instance, so we need to disconnect manually
    await api.disconnect();
  });

  it('filters a signed extrinsic', async () => {
    const [iblock] = await fetchBlocksBatches(api, [16832854]);

    const block = iblock.block;

    expect(
      filterExtrinsic(block.extrinsics[0], { isSigned: true }),
    ).toBeFalsy(); // Timestamp set
    expect(
      filterExtrinsic(block.extrinsics[2], { isSigned: true }),
    ).toBeTruthy();

    expect(
      filterExtrinsic(block.extrinsics[0], { isSigned: false }),
    ).toBeTruthy();
    expect(
      filterExtrinsic(block.extrinsics[2], { isSigned: false }),
    ).toBeFalsy();
  });

  it('decode fail message', async () => {
    const logger = getLogger('fetch');
    const consoleSpy = jest.spyOn(logger, 'error');

    const provider = new WsProvider(ENDPOINT_KARURA);
    const api = await ApiPromise.create({ provider });

    await expect(getBlockByHeight(api, 86614)).rejects.toThrow(
      /Unable to decode|failed decoding|unknown type/,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Update the chain types/),
    );
    consoleSpy.mockRestore();
    await api.disconnect();
  });

  it('decode normal message', async () => {
    const provider = new WsProvider(ENDPOINT_KARURA);
    const api = await ApiPromise.create({ provider });

    expect(await getBlockByHeight(api, 50710)).toBeTruthy();
    await api.disconnect();
  });

  it('return undefined if no timestamp set extrinsic', async () => {
    const provider = new WsProvider(ENDPOINT_SHIDEN);
    const api = await ApiPromise.create({ provider });
    const block1 = await getBlockByHeight(api, 1);
    expect(getTimestamp(block1)).toBeUndefined();
    await api.disconnect();
  });
});
