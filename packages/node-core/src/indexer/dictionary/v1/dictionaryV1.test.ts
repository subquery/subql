// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {EventEmitter2} from '@nestjs/event-emitter';
import {SubstrateDatasourceKind, SubstrateHandlerKind} from '@subql/types';
import {DictionaryQueryEntry} from '@subql/types-core';
import {range} from 'lodash';
import {NodeConfig} from '../../../configure';
import {BlockHeightMap} from '../../../utils/blockHeightMap';
import {DictionaryV1} from './dictionaryV1';
import {getGqlType} from './utils';

const mockDS = [
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 100,
    mapping: {
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
  // dictionaryResolver: 'https://kepler-auth.subquery.network'
});
// Need longer timeout
jest.setTimeout(50000);

describe('GraphqlTypes', () => {
  it('Supports arrays of primitives', () => {
    const stringType = getGqlType(['a', 'b', 'c']);
    expect(stringType).toEqual(`[String!]`);

    const number = getGqlType([1, 2, 3]);
    expect(number).toEqual(`[BigFloat!]`);
  });

  it('Throws arrays of non-primitives', () => {
    expect(() => getGqlType([{a: 1}])).toThrow('Object types not supported');
  });

  it('Throws with empty arrays', () => {
    expect(() => getGqlType([])).toThrow('Unable to determine array type');
  });
});

// export use in dictionary service test
// eslint-disable-next-line jest/no-export
export class TestDictionaryV1 extends DictionaryV1<any> {
  buildDictionaryQueryEntries(dataSources: any[]): DictionaryQueryEntry[] {
    return HAPPY_PATH_CONDITIONS;
  }
}

const m = new Map<number, any>();

mockDS.forEach((ds, index, dataSources) => {
  m.set(ds.startBlock, dataSources.slice(0, index + 1));
});

// eslint-disable-next-line jest/no-export
export const dsMap = new BlockHeightMap(m);

async function prepareDictionary(
  endpoint = DICTIONARY_ENDPOINT,
  chainId = DICTIONARY_CHAINID,
  nfg = nodeConfig,
  dsM = dsMap
): Promise<TestDictionaryV1> {
  const dictionary = new TestDictionaryV1(endpoint, chainId, nfg, new EventEmitter2());
  await (dictionary as any).init();
  dictionary.updateQueriesMap(dsM);
  return dictionary;
}

describe('Dictionary V1', () => {
  let dictionary: TestDictionaryV1;

  beforeAll(async () => {
    dictionary = await prepareDictionary();
  });

  describe('coreDictionary', () => {
    it('set startHeight of this dictionary', () => {
      // After metadata init, it should set startHeight of this dictionary
      expect(dictionary.startHeight).toEqual(1);
    });

    it('validateChainMeta and useDictionary', () => {
      expect((dictionary as any).validateChainMeta((dictionary as any).metadata)).toBeTruthy();
    });

    it('validate dictionary with a height', () => {
      expect(dictionary.heightValidation(100)).toBeTruthy();
      const beyond500 = (dictionary as any).metadata.lastProcessedHeight + 500;
      expect(dictionary.heightValidation(beyond500)).toBeFalsy();
    });

    it('able to build queryEntryMap', () => {
      dictionary.updateQueriesMap(dsMap);
      const _map = (dictionary as any).queriesMap?.getAll();

      assert(_map, 'Map should exist');

      expect([..._map.keys()]).toStrictEqual(mockDS.map((ds) => ds.startBlock));
      expect(_map?.size).toEqual(mockDS.length);
    });

    it('can use scoped dictionary query', async () => {
      dictionary.updateQueriesMap(dsMap);

      // Out of range of scoped entries
      const result = await dictionary.getData(100, 199, 10);
      expect(result?.batchBlocks.length).toEqual(0);

      const result2 = await dictionary.getData(1000, 10000, 10);
      expect(result2?.batchBlocks.length).toBeGreaterThan(0);
    });

    it('able to getDicitonaryQueryEntries', () => {
      const dictionaryQueryMap = new Map();

      // Mocks a Map object that where key == dataSource.startBlock and mocked DictionaryQueryEntries[] values
      // Hence testing, when provided a queryEndBlock, the correct DictionaryQueryEntries[] is returned
      for (let i = 0; i < mockDS.length; i++) {
        dictionaryQueryMap.set(
          [mockDS[i].startBlock],
          HAPPY_PATH_CONDITIONS.filter((dictionaryQuery, index) => i >= index)
        );
      }
      (dictionary as any).queriesMap = new BlockHeightMap(dictionaryQueryMap);
      let queryEndBlock = 150;

      // queryEndBlock > dictionaryQuery_0 && < dictionaryQuery_1. Output: dictionaryQuery_0
      expect((dictionary as any).queriesMap?.getSafe(queryEndBlock)).toEqual([HAPPY_PATH_CONDITIONS[0]]);

      queryEndBlock = 500;

      // queryEndBlock > dictionaryQuery_0 && == dictionaryQuery_1. Output: dictionaryQuery_1
      expect((dictionary as any).queriesMap?.getSafe(queryEndBlock)).toEqual([
        HAPPY_PATH_CONDITIONS[0],
        HAPPY_PATH_CONDITIONS[1],
      ]);

      queryEndBlock = 5000;
      // queryEndBlock > all dictionaryQuery
      expect((dictionary as any).queriesMap?.getSafe(queryEndBlock)).toEqual([
        HAPPY_PATH_CONDITIONS[0],
        HAPPY_PATH_CONDITIONS[1],
        HAPPY_PATH_CONDITIONS[2],
      ]);

      queryEndBlock = 50;
      // queryEndBlock < min dictionaryQuery
      expect((dictionary as any).queriesMap?.getSafe(queryEndBlock)).toEqual(undefined);
    });
  });

  it('get metadata', () => {
    const metadata = (dictionary as any).metadata;
    expect(metadata.startHeight).toBe(1);
    expect(metadata.genesisHash).toBe('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');
  }, 500000);

  it('init metadata and get metadata', async () => {
    await (dictionary as any).init();
    const metadata = (dictionary as any).metadata;
    expect(metadata.startHeight).toBe(1);
    expect(metadata.genesisHash).toBe('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');
    // After metadata init, it should set startHeight of this dictionary
    expect(dictionary.startHeight).toEqual(1);
  }, 500000);

  it('return dictionary query result', async () => {
    const batchSize = 30;
    const startBlock = 1000; // first event at 1463, this will pick the correct query map
    const endBlock = 10001;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic?.batchBlocks.length).toBeGreaterThan(1);
    expect(dic?.batchBlocks[0]).toBe(1463);
  }, 500000);

  it('should return undefined startblock height greater than dictionary last processed height', async () => {
    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic).toBeUndefined();
  }, 500000);

  it('should use metadata last process height at end of query height', async () => {
    await (dictionary as any).init();
    const fakeApiFinalHeight = 40001;
    // assume already synced up with chain
    // 1 + dictionaryQuerySize
    const endBlock = dictionary.getQueryEndBlock(10001, fakeApiFinalHeight);
    expect(endBlock).toEqual(10001);
  }, 50000);
});

describe('Individual dictionary V1 test', () => {
  let dictionary: TestDictionaryV1;
  it('return undefined when dictionary api failed', async () => {
    const nodeConfig = new NodeConfig({
      subquery: 'asdf',
      subqueryName: 'asdf',
      networkEndpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
      dictionaryTimeout: 10,
      dictionaryResolver: false,
    });

    dictionary = await prepareDictionary(
      'https://api.subquery.network/sq/subquery/dictionary-not-exist',
      '0x21121',
      nodeConfig
    );

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic).toBeUndefined();
  }, 500000);

  it('limits the dictionary query to that block range', async () => {
    // Only have 1 condition for each range. This is to simulate each "project upgrade" having no overlapping ds

    dictionary = await prepareDictionary();
    dictionary.buildDictionaryQueryEntries = (ds) => [HAPPY_PATH_CONDITIONS[ds.length - 1]];
    dictionary.updateQueriesMap(dsMap);

    const getDictionaryQuerySpy = jest.spyOn(dictionary as any, 'dictionaryQuery');

    const results = await dictionary.getData(200, 600, 10);

    expect(getDictionaryQuerySpy).toHaveBeenCalledWith(200, 499, 10, [
      {
        entity: 'events',
        conditions: [
          {field: 'module', value: 'staking'},
          {field: 'event', value: 'Bonded'},
        ],
      },
    ]);
  });

  it('test query the correct range', async () => {
    dictionary = await prepareDictionary();
    dictionary.buildDictionaryQueryEntries = (ds) => [
      {
        entity: 'extrinsics',
        conditions: [
          {field: 'module', value: 'timestamp'},
          {field: 'call', value: 'set'},
        ],
      },
    ];
    dictionary.updateQueriesMap(dsMap);

    const batchSize = 30;
    const startBlock = 1000;
    const endBlock = 10001;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic?.batchBlocks).toEqual(range(startBlock, startBlock + batchSize));
  }, 500000);

  it('use minimum value of event/extrinsic returned block as batch end block', async () => {
    const batchSize = 50;
    const startBlock = 333300;
    const endBlock = 340000;

    dictionary = await prepareDictionary();
    dictionary.buildDictionaryQueryEntries = (ds) => [
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
    ];
    dictionary.updateQueriesMap(dsMap);
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    // with dictionary distinct, this should give last block at 339186
    expect(dic?.batchBlocks[dic.batchBlocks.length - 1]).toBe(339186);
  }, 500000);
});
