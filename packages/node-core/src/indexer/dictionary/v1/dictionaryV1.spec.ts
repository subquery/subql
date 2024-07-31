// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {ApolloClient, HttpLink, InMemoryCache} from '@apollo/client/core';
import fetch from 'cross-fetch';
import {range} from 'lodash';
import {NodeConfig} from '../../../configure';
import {BlockHeightMap} from '../../../utils/blockHeightMap';
import {dsMap, mockDS, TestDictionaryV1, HAPPY_PATH_CONDITIONS} from '../dictionary.fixtures';
import {getGqlType} from './utils';

const DICTIONARY_ENDPOINT = `https://gateway.subquery.network/query/QmUGBdhQKnzE8q6x6MPqP6LNZGa8gzXf5gkdmhzWjdFGfL`;
const DICTIONARY_CHAINID = `0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3`;

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: {'wss://polkadot.api.onfinality.io/public-ws': {}},
  dictionaryTimeout: 10,
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

async function prepareDictionary(
  endpoint = DICTIONARY_ENDPOINT,
  chainId = DICTIONARY_CHAINID,
  nfg = nodeConfig,
  dsM = dsMap
): Promise<TestDictionaryV1> {
  const dictionary = new TestDictionaryV1(endpoint, chainId, nfg, HAPPY_PATH_CONDITIONS);
  await (dictionary as any).init();
  dictionary.updateQueriesMap(dsM);
  return dictionary;
}

describe('Dictionary V1', () => {
  let dictionary: TestDictionaryV1;

  beforeAll(async () => {
    dictionary = await prepareDictionary();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
  });

  it('init metadata and get metadata', async () => {
    await (dictionary as any).init();
    const metadata = (dictionary as any).metadata;
    expect(metadata.startHeight).toBe(1);
    expect(metadata.genesisHash).toBe('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');
    // After metadata init, it should set startHeight of this dictionary
    expect(dictionary.startHeight).toEqual(1);
  });

  it('return dictionary query result', async () => {
    const batchSize = 30;
    const startBlock = 1000; // first event at 1463, this will pick the correct query map
    const endBlock = 10001;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic?.batchBlocks.length).toBeGreaterThan(1);
    expect(dic?.batchBlocks[0]).toBe(1463);
  });

  it('should return undefined startblock height greater than dictionary last processed height', async () => {
    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic).toBeUndefined();
  });

  it('should use metadata last process height at end of query height', () => {
    const fakeApiFinalHeight = 40001;
    // assume already synced up with chain
    // 1 + dictionaryQuerySize
    const endBlock = dictionary.getQueryEndBlock(10001, fakeApiFinalHeight);
    expect(endBlock).toEqual(10001);
  });
});

describe('Individual dictionary V1 test', () => {
  let dictionary: TestDictionaryV1;

  beforeEach(async () => {
    dictionary = await prepareDictionary();
  });

  it('return undefined when dictionary api failed', async () => {
    // Create a new dictionary for this test so we don't break other instances
    const dictionary = await prepareDictionary();

    // Replace client with one that wont work
    (dictionary as any)._client = new ApolloClient({
      cache: new InMemoryCache({resultCaching: true}),
      link: new HttpLink({uri: 'https://api.subquery.network/sq/subquery/dictionary-not-exist', fetch}),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
        },
        query: {
          fetchPolicy: 'no-cache',
        },
      },
    });

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionary.getData(startBlock, endBlock, batchSize);
    expect(dic).toBeUndefined();
  });

  it('limits the dictionary query to that block range', async () => {
    // Only have 1 condition for each range. This is to simulate each "project upgrade" having no overlapping ds
    dictionary.buildDictionaryQueryEntries = (ds) => [HAPPY_PATH_CONDITIONS[ds.length - 1]];
    dictionary.updateQueriesMap(dsMap);

    const getDictionaryQuerySpy = jest.spyOn(dictionary as any, 'dictionaryQuery');

    await dictionary.getData(200, 600, 10);

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
  });

  it('use minimum value of event/extrinsic returned block as batch end block', async () => {
    const batchSize = 50;
    const startBlock = 333300;
    const endBlock = 340000;

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
  });
});
