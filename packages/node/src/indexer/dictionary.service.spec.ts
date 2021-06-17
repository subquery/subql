// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DictionaryService } from './dictionary.service';

describe('DictionaryService', () => {
  it('return dictionary query result', async () => {
    const dictionaryService = new DictionaryService();

    const batchSize = 30;
    const startBlock = 1;
    const indexFilters = {
      existBlockHandler: false,
      existEventHandler: true,
      existExtrinsicHandler: true,
      eventFilters: [
        { module: 'staking', method: 'Bonded' },
        { module: 'balances', method: 'Reward' },
        { module: 'balances', method: 'Slash' },
      ],
      extrinsicFilters: [{ module: 'staking', method: 'bond' }],
    };
    const dic = await dictionaryService.getDictionary(
      startBlock,
      batchSize,
      'https://api.subquery.network/sq/jiqiang90/polkadot-map',
      indexFilters,
    );

    expect(dic.batchBlocks.length).toBeGreaterThan(1);
    expect(dic.specVersions.length).toBeGreaterThan(1);
  }, 500000);
});
