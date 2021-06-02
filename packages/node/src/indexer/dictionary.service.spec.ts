// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DictionaryService } from './dictionary.service';

describe('DictionaryService', () => {
  it.skip('print dictionary query', async () => {
    const dictionaryService = new DictionaryService();

    const batchSize = 50; //event + extrinsic, should keep this half size of our default batchSize
    const startOffset = 150;
    const startBlock = 10086;
    const indexEvents = [
      { type: 'Event', module: 'balances', event: 'Deposit' },
      { type: 'Event', module: 'balances', event: 'Transfer' },
    ];
    const indexExtrinsics = [
      { type: 'Extrinsic', module: 'staking', call: 'bond' },
    ];
    const query = dictionaryService.dictionaryQuery(
      startBlock,
      batchSize,
      startOffset,
      indexEvents,
      indexExtrinsics,
    );
    const batch = await dictionaryService.getBlockBatch(
      'http://localhost:3001',
      query,
    );
    console.log(`batch: ${batch}`);
  });
});
