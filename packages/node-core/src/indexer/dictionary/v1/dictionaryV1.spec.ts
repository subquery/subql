// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {range} from 'lodash';
import {NodeConfig} from '../../../configure';
import {BlockHeightMap} from '../../../utils/blockHeightMap';
import {dsMap, mockDS, TestDictionaryV1, HAPPY_PATH_CONDITIONS} from '../dictionary.fixtures';
import {DictionaryQueryError} from './dictionaryV1';
import {distinctErrorEscaped, getGqlType} from './utils';

const DICTIONARY_ENDPOINT = `https://gateway.subquery.network/query/QmSxAgGGpaMrYzooWpydmwzutREwomL5nupLZqxURzuJTo`;
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

    // Point it at an endpoint that won't work
    (dictionary as any).dictionaryEndpoint = 'https://api.subquery.network/sq/subquery/dictionary-not-exist';

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

/** Exposes the protected `query` to the tests. */
class QueryableDictionaryV1 extends TestDictionaryV1 {
  async runQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.query<T>(query, variables);
  }
}

describe('Dictionary V1 queries', () => {
  const metadata = {lastProcessedHeight: 10000, genesisHash: DICTIONARY_CHAINID};
  const distinctUnsupported = [{message: 'Unknown argument "distinct" on field "Query.events".'}];

  const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});

  const queryableDictionary = (): QueryableDictionaryV1 =>
    new QueryableDictionaryV1(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig, HAPPY_PATH_CONDITIONS);

  let fetchSpy: jest.SpyInstance<Promise<Response>, Parameters<typeof fetch>>;

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('posts the query text and variables, and returns the data', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({data: {_metadata: metadata}}));
    const query = 'query($a:String!){_metadata{lastProcessedHeight}}';

    const data = await queryableDictionary().runQuery(query, {a: 'b'});

    expect(data).toEqual({_metadata: metadata});
    expect(fetchSpy).toHaveBeenCalledWith(
      DICTIONARY_ENDPOINT,
      expect.objectContaining({method: 'POST', body: JSON.stringify({query, variables: {a: 'b'}})})
    );
  });

  it('throws the GraphQL errors the dictionary returns', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({errors: distinctUnsupported}, 400));

    const error = await queryableDictionary()
      .runQuery('query{events{nodes{blockHeight}}}')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(DictionaryQueryError);
    expect(error).toMatchObject({status: 400, graphQLErrors: distinctUnsupported});
    // what `getData` checks to retry without `distinct`
    expect(JSON.stringify(error)).toContain(distinctErrorEscaped);
  });

  it('throws when the dictionary does not answer with JSON', async () => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('<html>Forbidden</html>', {status: 403}));

    await expect(queryableDictionary().runQuery('query{_metadata{lastProcessedHeight}}')).rejects.toThrow(
      'Dictionary returned HTTP 403 without a JSON body'
    );
  });

  it('retries a query without distinct when the dictionary does not support it', async () => {
    const queries: string[] = [];
    fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      const {query} = JSON.parse(String(init?.body)) as {query: string};
      queries.push(query);
      if (!query.includes('events')) {
        return Promise.resolve(jsonResponse({data: {_metadata: metadata}}));
      }
      if (query.includes('distinct')) {
        return Promise.resolve(jsonResponse({errors: distinctUnsupported}, 400));
      }
      return Promise.resolve(
        jsonResponse({data: {_metadata: metadata, events: {nodes: [{blockHeight: '150'}, {blockHeight: '170'}]}}})
      );
    });
    const dictionary = await prepareDictionary();

    const result = await dictionary.getData(100, 400, 10);

    expect(result?.batchBlocks).toEqual([150, 170]);
    const batchQueries = queries.filter((query) => query.includes('events'));
    expect(batchQueries.map((query) => query.includes('distinct'))).toEqual([true, false]);
  });
});
