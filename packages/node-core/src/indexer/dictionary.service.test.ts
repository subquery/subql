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

  it('able to build queryEntryMap', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);

    dictionaryService.buildDictionaryEntryMap(mockDS, () => HAPPY_PATH_CONDITIONS);
    const _map = (dictionaryService as any).mappedDictionaryQueryEntries;

    expect([..._map.keys()]).toStrictEqual(mockDS.map((ds) => ds.startBlock));
    expect(_map.size).toEqual(mockDS.length);
  });

  it('detect query entry changes with endBlock changes', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);

    dictionaryService.buildDictionaryEntryMap(mockDS, () => HAPPY_PATH_CONDITIONS);

    // change at 100 -> 500 -> 1000
    // init
    dictionaryService.updateDictionaryQueryEntries(100);
    // should remain unchanged
    expect(dictionaryService.updateDictionaryQueryEntries(150)).toBeFalsy();
    // should changed
    expect(dictionaryService.updateDictionaryQueryEntries(500)).toBeTruthy();
    // should remain unchanged
    expect(dictionaryService.updateDictionaryQueryEntries(501)).toBeFalsy();
  });

  it('able to update Dictionary entries with returned block batches', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const dictionaryQueryMap = new Map();

    // Mocks a Map object that where key == dataSource.startBlock and mocked DictionaryQueryEntries[] values
    // Hence testing, when provided a queryEndBlock, the correct DictionaryQueryEntries[] is returned
    for (let i = 0; i < mockDS.length; i++) {
      dictionaryQueryMap.set(
        mockDS[i].startBlock,
        HAPPY_PATH_CONDITIONS.filter((dictionaryQuery, index) => i >= index)
      );
    }
    (dictionaryService as any).mappedDictionaryQueryEntries = dictionaryQueryMap;

    // queryEndBlock > dictionaryQuery_0 && < dictionaryQuery_1. Output: dictionaryQuery_0
    dictionaryService.updateDictionaryQueryEntries(150);
    expect(dictionaryService.getCurrentDictionaryEntries()).toEqual([HAPPY_PATH_CONDITIONS[0]]);

    // queryEndBlock > dictionaryQuery_0 && == dictionaryQuery_1. Output: dictionaryQuery_1
    dictionaryService.updateDictionaryQueryEntries(500);
    expect(dictionaryService.getCurrentDictionaryEntries()).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
    ]);

    // queryEndBlock > all dictionaryQuery
    dictionaryService.updateDictionaryQueryEntries(5000);
    expect(dictionaryService.getCurrentDictionaryEntries()).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
      HAPPY_PATH_CONDITIONS[2],
    ]);

    // queryEndBlock < min dictionaryQuery
    dictionaryService.updateDictionaryQueryEntries(50);
    expect(dictionaryService.getCurrentDictionaryEntries()).toBeUndefined();
  });

  it('sort map', () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const unorderedDs = [mockDS[2], mockDS[0], mockDS[1]];
    dictionaryService.buildDictionaryEntryMap(unorderedDs, (startBlock) => startBlock as any);
    expect([...(dictionaryService as any).mappedDictionaryQueryEntries.keys()]).toEqual(
      unorderedDs.map((ds) => ds.startBlock)
    );
  });

  it('adjust dictionary entries with attempting query result', async () => {
    const dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, nodeConfig);
    const dictionaryQueryMap = new Map();

    // Mocks a Map object that where key == dataSource.startBlock and mocked DictionaryQueryEntries[] values
    // Hence testing, when provided a queryEndBlock, the correct DictionaryQueryEntries[] is returned
    for (let i = 0; i < mockDS.length; i++) {
      dictionaryQueryMap.set(
        mockDS[i].startBlock,
        HAPPY_PATH_CONDITIONS.filter((dictionaryQuery, index) => i >= index)
      );
    }
    (dictionaryService as any).mappedDictionaryQueryEntries = dictionaryQueryMap;

    dictionaryService.updateDictionaryQueryEntries(150);

    const queryDictionaryEntriesDynamicSpy = jest.spyOn(dictionaryService as any, `queryDictionaryEntriesDynamic`);

    await dictionaryService.queryDictionaryEntriesDynamic(150, 100100, 30);
    // queries endBlocks is 6421
    expect((dictionaryService as any).currentDictionaryEntryIndex).toEqual(1000);
    expect(queryDictionaryEntriesDynamicSpy).toBeCalledTimes(2);
    await dictionaryService.queryDictionaryEntriesDynamic(6422, 106422, 30);
    // use the same dictionary entry, call time only increase by 1
    expect((dictionaryService as any).currentDictionaryEntryIndex).toEqual(1000);
    expect(queryDictionaryEntriesDynamicSpy).toBeCalledTimes(3);
  });
});
