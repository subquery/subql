// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NodeConfig} from '@subql/node-core';
import {DictionaryQueryEntry, SubstrateDatasourceKind, SubstrateHandlerKind} from '@subql/types';
import {range} from 'lodash';
import {DictionaryService} from './dictionary.service';

const mockDS = [
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 100,
    mapping: {
      entryScript: '',
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Event,
          filter: {
            module: 'balances',
            method: 'Deposit',
          },
        },
      ],
      file: '',
    },
  },
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 500,
    mapping: {
      entryScript: '',
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Call,
          filter: {
            module: 'balances',
            method: 'Deposit',
            success: true,
          },
        },
      ],
      file: '',
    },
  },
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 1000,
    mapping: {
      entryScript: '',
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Call,
          filter: {
            module: 'balances',
            method: 'Deposit',
            success: true,
          },
        },
      ],
      file: '',
    },
  },
];

const DICTIONARY_ENDPOINT = `https://api.subquery.network/sq/subquery/polkadot-dictionary`;

const HAPPY_PATH_CONDITIONS = () => [
  {
    entity: 'events',
    conditions: [
      {field: 'module', value: 'staking'},
      {field: 'event', value: 'Bonded'},
    ],
  },
  {
    entity: 'events',
    conditions: [
      {field: 'module', value: 'balances'},
      {field: 'event', value: 'Reward'},
    ],
  },
  {
    entity: 'events',
    conditions: [
      {field: 'module', value: 'balances'},
      {field: 'event', value: 'Slash'},
    ],
  },
  {
    entity: 'extrinsics',
    conditions: [
      {field: 'module', value: 'staking'},
      {field: 'call', value: 'bond'},
    ],
  },
];

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: 'wss://polkadot.api.onfinality.io/public-ws',
  dictionaryTimeout: 10,
});

describe('DictionaryService', () => {
  it('return dictionary query result', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);

    expect(dic.batchBlocks.length).toBeGreaterThan(1);
  }, 500000);

  it('return undefined when dictionary api failed', async () => {
    const dictionaryService = new DictionaryService(
      'https://api.subquery.network/sq/subquery/dictionary-not-exist',
      nodeConfig
    );
    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic).toBeUndefined();
  }, 500000);

  it('should return meta even startblock height greater than dictionary last processed height', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic._metadata).toBeDefined();
  }, 500000);

  it('test query the correct range', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, [
      {
        entity: 'extrinsics',
        conditions: [
          {field: 'module', value: 'timestamp'},
          {field: 'call', value: 'set'},
        ],
      },
    ]);
    expect(dic.batchBlocks).toEqual(range(startBlock, startBlock + batchSize));
  }, 500000);

  it('use minimum value of event/extrinsic returned block as batch end block', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const batchSize = 50;
    const startBlock = 333300;
    const endBlock = 340000;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, [
      {
        //last event at block 333524
        entity: 'events',
        conditions: [
          {field: 'module', value: 'session'},
          {field: 'event', value: 'NewSession'},
        ],
      },
      {
        entity: 'events',
        conditions: [
          {field: 'module', value: 'staking'},
          {field: 'event', value: 'EraPayout'},
        ],
      },
      {
        entity: 'events',
        conditions: [
          {field: 'module', value: 'staking'},
          {field: 'event', value: 'Reward'},
        ],
      },
      {
        //last extrinsic at block 339186
        entity: 'extrinsics',
        conditions: [
          {field: 'module', value: 'staking'},
          {field: 'call', value: 'payoutStakers'},
        ],
      },
      {
        entity: 'extrinsics',
        conditions: [
          {field: 'module', value: 'utility'},
          {field: 'call', value: 'batch'},
        ],
      },
    ]);
    expect(dic.batchBlocks[dic.batchBlocks.length - 1]).toBe(333524);
  }, 500000);

  /*
  this should test if the map is able to generate in the correct way, given a project.yaml with multiple ds
  map should generate given single ds in project.yaml
   */
  it('able to build queryEntryMap', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);

    // jest should mock this following function below
    dictionaryService.buildDictionaryEntryMap(mockDS, () => HAPPY_PATH_CONDITIONS());
    const map = (dictionaryService as any).mappedDictionaryQueryEntries;
    expect([...map.keys()]).toStrictEqual(mockDS.map((ds) => ds.startBlock));
    expect(map.size).toEqual(mockDS.length);
  });

  // If endBlock logic
  // for getDictionaryQueryEntries
  // when endBlock given, it should output the correct value
  it('able to getDicitonaryQueryEntries', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const endBlock_1 = 150;
    const endBlock_2 = 250;
    const _map = new Map();
    _map.set(100, [{entity: 'evmLogs', conditions: ['hello']}]);
    _map.set(200, [
      {entity: 'evmLogs', conditions: ['hello']},
      {entity: 'evmTransactions', conditions: ['world']},
    ]);

    /*
    Map(2) {
  753000 => [ { entity: 'evmLogs', conditions: [Array] } ],
  754000 => [
    { entity: 'evmLogs', conditions: [Array] },
    { entity: 'evmTransactions', conditions: [Array] }
  ]

     */
    // const _map = {
    //   100:[HAPPY_PATH_CONDITIONS()[0]],
    //   200:[HAPPY_PATH_CONDITIONS()[0], HAPPY_PATH_CONDITIONS()[0]]
    // }
    const selectedQueryEntry_1 = dictionaryService.getDictionaryQueryEntries(endBlock_1);
    const selectedQueryEntry_2 = dictionaryService.getDictionaryQueryEntries(endBlock_2);

    console.log(selectedQueryEntry_1);
    // expect(selectedQueryEntry_1.length).toEqual(_map['100'].length)
    // expect(selectedQueryEntry_2.length).toEqual(2)
  });
});
