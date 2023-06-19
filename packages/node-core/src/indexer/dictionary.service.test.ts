// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DictionaryQueryEntry, SubstrateDatasourceKind, SubstrateHandlerKind} from '@subql/types';
import {range} from 'lodash';
import {NodeConfig} from '../configure';
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
const DICTIONARY_CHAINID = `0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3`;

const HAPPY_PATH_CONDITIONS: DictionaryQueryEntry[] = [
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
  networkEndpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
  dictionaryTimeout: 10,
});

describe('DictionaryService', () => {
  it('return dictionary query result', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);

    expect(dic?.batchBlocks.length).toBeGreaterThan(1);
  }, 500000);

  it('return undefined when dictionary api failed', async () => {
    const dictionaryService = new DictionaryService(
      'https://api.subquery.network/sq/subquery/dictionary-not-exist',
      '0x21121',
      nodeConfig
    );

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic).toBeUndefined();
  }, 500000);

  it('should return meta even startblock height greater than dictionary last processed height', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic?._metadata).toBeDefined();
  }, 500000);

  it('test query the correct range', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

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
    expect(dic?.batchBlocks).toEqual(range(startBlock, startBlock + batchSize));
  }, 500000);

  it('use minimum value of event/extrinsic returned block as batch end block', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

    const batchSize = 50;
    const startBlock = 333300;
    const endBlock = 340000;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, [
      {
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
    // with dictionary distinct, this should give last block at 339186
    expect(dic?.batchBlocks[dic.batchBlocks.length - 1]).toBe(339186);
  }, 500000);

  it('able to build queryEntryMap', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

    dictionaryService.buildDictionaryEntryMap(mockDS, () => HAPPY_PATH_CONDITIONS);
    const _map = (dictionaryService as any).mappedDictionaryQueryEntries;

    expect([..._map.keys()]).toStrictEqual(mockDS.map((ds) => ds.startBlock));
    expect(_map.size).toEqual(mockDS.length);
  });

  it('able to getDicitonaryQueryEntries', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);
    const dictionaryQueryMap = new Map();

    // Mocks a Map object that where key == dataSource.startBlock and mocked DictionaryQueryEntries[] values
    // Hence testing, when provided a queryEndBlock, the correct DictionaryQueryEntries[] is returned
    for (let i = 0; i < mockDS.length; i++) {
      dictionaryQueryMap.set(
        [mockDS[i].startBlock],
        HAPPY_PATH_CONDITIONS.filter((dictionaryQuery, index) => i >= index)
      );
    }
    (dictionaryService as any).mappedDictionaryQueryEntries = dictionaryQueryMap;
    let queryEndBlock = 150;

    // queryEndBlock > dictionaryQuery_0 && < dictionaryQuery_1. Output: dictionaryQuery_0
    expect(dictionaryService.getDictionaryQueryEntries(queryEndBlock)).toEqual([HAPPY_PATH_CONDITIONS[0]]);

    queryEndBlock = 500;

    // queryEndBlock > dictionaryQuery_0 && == dictionaryQuery_1. Output: dictionaryQuery_1
    expect(dictionaryService.getDictionaryQueryEntries(queryEndBlock)).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
    ]);

    queryEndBlock = 5000;
    // queryEndBlock > all dictionaryQuery
    expect(dictionaryService.getDictionaryQueryEntries(queryEndBlock)).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
      HAPPY_PATH_CONDITIONS[2],
    ]);

    queryEndBlock = 50;
    // queryEndBlock < min dictionaryQuery
    expect(dictionaryService.getDictionaryQueryEntries(queryEndBlock)).toEqual([]);
  });

  it('sort map', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig);

    const unorderedDs = [mockDS[2], mockDS[0], mockDS[1]];
    dictionaryService.buildDictionaryEntryMap(unorderedDs, (startBlock) => startBlock as any);
    expect([...(dictionaryService as any).mappedDictionaryQueryEntries.keys()]).toStrictEqual([100, 500, 1000]);
  });
});
