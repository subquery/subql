// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import Cron from 'cron-converter';
import {
  fetchBlocksArray,
  fetchBlocksBatches,
  filterExtrinsic,
} from './substrate';

const ENDPOINT_POLKADOT = 'wss://rpc.polkadot.io';
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

  it('filters a signed extrinsic', async () => {
    const [block] = await fetchBlocksBatches(api, [16832854]);

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
});
