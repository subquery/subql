// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import axios from 'axios';
import { DictionaryService } from './dictionary.service';

jest.mock('../utils/substrate', () =>
  jest.createMockFromModule('../utils/substrate'),
);

describe('DictionaryService', () => {
  it('print dictionary query', async () => {
    const dictionaryService = new DictionaryService();
    const indexEvents = [
      { type: 'Event', module: 'balances', event: 'Deposit' },
      { type: 'Event', module: 'balances', event: 'Transfer' },
    ];
    const indexExtrinsics = [
      { type: 'Extrinsic', module: 'staking', call: 'bond' },
    ];
    const query = dictionaryService.queryDictionary(
      indexEvents,
      indexExtrinsics,
    );
    console.log(query);
    try {
      const resp = await axios.post('http://localhost:3001', {
        query: query,
      });
      console.log(resp.data);
    } catch (err) {
      // Handle Error Here
      console.error(err);
    }
  });
});
