// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DictionaryService } from './dictionary.service';

describe('DictionaryService', () => {
  it.skip('print dictionary query', async () => {
    const dictionaryService = new DictionaryService();

    const batchSize = 30;
    const startBlock = 1;
    const indexEvents = [
      { module: 'staking', method: 'Bonded' },
      { module: 'balances', method: 'Reward' },
      { module: 'balances', method: 'Slash' },
    ];
    const indexExtrinsics = [{ module: 'staking', method: 'bond' }];
    const query = dictionaryService.dictionaryQuery(
      startBlock,
      batchSize,
      true,
      false,
      indexEvents,
      indexExtrinsics,
    );
    const dic = await dictionaryService.getDictionary(
      'https://api.subquery.network/sq/jiqiang90/polkadot-map',
      query,
    );
    const specs = dictionaryService.getSpecVersionMap(dic);
    const batches = dictionaryService.getBlockBatch(dic);
    expect(batches.length).toBeGreaterThan(1);
    expect(specs.length).toEqual(1);
  });
  it.skip('get block batch throw error when invalid api', async () => {
    const dictionaryService = new DictionaryService();

    const query = `    
    query{events(filter:{
        blockHeight:{greaterThan:"1"},
        or:[
         
            {
              and:[
              {module:{equalTo: "balances"}},
              {event:{equalTo:"Deposit"}}
            ]},
            {
              and:[
              {module:{equalTo: "balances"}},
              {event:{equalTo:"Transfer"}}
            ]},
        ]
      }, orderBy:BLOCK_HEIGHT_ASC,first: 50,offset: 0){
        nodes{
          blockHeight
        }
      }}`;
    expect(
      await dictionaryService.getDictionary('https://api.notworking.io', query),
    ).toThrow();
  });
});
