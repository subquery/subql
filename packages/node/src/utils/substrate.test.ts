// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import Cron from 'cron-converter';
import { fetchBlocksArray } from './substrate';

const ENDPOINT_POLKADOT = 'wss://polkadot.api.onfinality.io/public-ws';
const ENDPOINT_KARURA = 'wss://karura-rpc-0.aca-api.network';

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
    const cron = new Cron();
    expect(() => {
      try {
        cron.fromString(cronString);
      } catch (e) {
        throw new Error(`invalid cron expression: ${cronString}`);
      }
    }).toThrow(Error);
  });

  it('validate block hash after fetch', async () => {
    // This endpoint has issue when fetch block 3467086
    const provider = new WsProvider(ENDPOINT_KARURA);
    api = await ApiPromise.create({ provider });
    await expect(
      fetchBlocksArray(api, [3467085, 3467086]),
    ).rejects.toThrowError(
      'fetched block header hash 0xdcdd89927d8a348e00257e1ecc8617f45edb5118efff3ea2f9961b2ad9b7690a is not match with blockHash 0xd13a656c8c4cd7a6f7d03db8209eee9c597edffba1b7ee2dc40844089e10b21a at block 3467086',
    );
  });
});
