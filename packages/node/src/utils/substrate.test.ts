// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import Cron from 'cron-converter';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { filterBlock } from './substrate';

const endpoint = 'wss://polkadot.api.onfinality.io/public-ws';

jest.setTimeout(100000);

describe('substrate utils', () => {
  let api: ApiPromise;
  beforeAll(async () => {
    const provider = new WsProvider(endpoint);
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
});
