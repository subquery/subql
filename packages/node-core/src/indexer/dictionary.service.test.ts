// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {EventEmitter2} from '@nestjs/event-emitter';
import {NETWORK_FAMILY} from '@subql/common';
import {SubstrateDatasourceKind, SubstrateHandlerKind} from '@subql/types';
import {DictionaryQueryEntry} from '@subql/types-core';
import {range} from 'lodash';
import {NodeConfig} from '../configure';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {DictionaryService, getGqlType} from './dictionary.service';

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

describe('DictionaryService', () => {
  let dictionaryService: DictionaryService;

  let dsMap: BlockHeightMap<any>;

  beforeEach(() => {
    dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, DICTIONARY_CHAINID, nodeConfig, new EventEmitter2());

    const m = new Map<number, any>();

    mockDS.forEach((ds, index, dataSources) => {
      m.set(ds.startBlock, dataSources.slice(0, index + 1));
    });

    dsMap = new BlockHeightMap(m);
  });

  it('return dictionary query result', async () => {
    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);

    expect(dic?.batchBlocks.length).toBeGreaterThan(1);
  }, 500000);

  it('correctly runs initialValidation', async () => {
    await expect(
      dictionaryService.initValidation('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3')
    ).resolves.toBe(true);

    dictionaryService = new DictionaryService(DICTIONARY_ENDPOINT, 'INAVLID CHAIN ID', nodeConfig, new EventEmitter2());
    await expect(dictionaryService.initValidation('INAVLID CHAIN GENESIS HASH')).resolves.toBe(false);
    expect(dictionaryService.useDictionary).toBeFalsy();
  });

  // SubQuery managed service is no longer running Polkadot/Kusama dictionaries
  it.skip('works when `dictionaryResolver` is not defined', async () => {
    dictionaryService = new DictionaryService(
      DICTIONARY_ENDPOINT,
      DICTIONARY_CHAINID,
      {dictionaryTimeout: 10} as NodeConfig,
      new EventEmitter2()
    );

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);

    expect(dic?.batchBlocks.length).toBeGreaterThan(1);
  });

  it('return undefined when dictionary api failed', async () => {
    dictionaryService = new DictionaryService(
      'https://api.subquery.network/sq/subquery/dictionary-not-exist',
      '0x21121',
      nodeConfig,
      new EventEmitter2()
    );

    const batchSize = 30;
    const startBlock = 1;
    const endBlock = 10001;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic).toBeUndefined();
  }, 500000);

  it('should return undefined startblock height greater than dictionary last processed height', async () => {
    const batchSize = 30;
    const startBlock = 400000000;
    const endBlock = 400010000;
    const dic = await dictionaryService.getDictionary(startBlock, endBlock, batchSize, HAPPY_PATH_CONDITIONS);
    expect(dic).toBeUndefined();
  }, 500000);

  it('test query the correct range', async () => {
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
    dictionaryService.buildDictionaryEntryMap(dsMap, () => HAPPY_PATH_CONDITIONS);
    const _map = dictionaryService.queriesMap?.getAll();

    assert(_map, 'Map should exist');

    expect([..._map.keys()]).toStrictEqual(mockDS.map((ds) => ds.startBlock));
    expect(_map?.size).toEqual(mockDS.length);
  });

  it('can use scoped dictionary query', async () => {
    dictionaryService.buildDictionaryEntryMap(dsMap, (dss) => HAPPY_PATH_CONDITIONS.slice(0, dss.length));

    // Out of range of scoped entries
    const result = await dictionaryService.scopedDictionaryEntries(0, 99, 10);
    expect(result?.batchBlocks.length).toEqual(0);

    const result2 = await dictionaryService.scopedDictionaryEntries(1000, 10000, 10);
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
    dictionaryService.queriesMap = new BlockHeightMap(dictionaryQueryMap);
    let queryEndBlock = 150;

    // queryEndBlock > dictionaryQuery_0 && < dictionaryQuery_1. Output: dictionaryQuery_0
    expect(dictionaryService.queriesMap?.getSafe(queryEndBlock)).toEqual([HAPPY_PATH_CONDITIONS[0]]);

    queryEndBlock = 500;

    // queryEndBlock > dictionaryQuery_0 && == dictionaryQuery_1. Output: dictionaryQuery_1
    expect(dictionaryService.queriesMap?.getSafe(queryEndBlock)).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
    ]);

    queryEndBlock = 5000;
    // queryEndBlock > all dictionaryQuery
    expect(dictionaryService.queriesMap?.getSafe(queryEndBlock)).toEqual([
      HAPPY_PATH_CONDITIONS[0],
      HAPPY_PATH_CONDITIONS[1],
      HAPPY_PATH_CONDITIONS[2],
    ]);

    queryEndBlock = 50;
    // queryEndBlock < min dictionaryQuery
    expect(dictionaryService.queriesMap?.getSafe(queryEndBlock)).toEqual(undefined);
  });

  it('limits the dictionary query to that block range', async () => {
    // Only have 1 condition for each range. This is to simulate each "project upgrade" having no overlapping ds
    dictionaryService.buildDictionaryEntryMap(dsMap, (ds) => [HAPPY_PATH_CONDITIONS[ds.length - 1]]);

    const getDictionarySpy = jest.spyOn(dictionaryService, 'getDictionary');

    const results = await dictionaryService.scopedDictionaryEntries(200, 600, 10);

    expect(getDictionarySpy).toHaveBeenCalledWith(200, 499, 10, [
      {
        entity: 'events',
        conditions: [
          {field: 'module', value: 'staking'},
          {field: 'event', value: 'Bonded'},
        ],
      },
    ]);

    // Then end block of the selected queries map item
    expect(results?.queryEndBlock).toEqual(499);
  });

  // TODO write a test that queries over 2 block ranges in case DS has been removed

  it('can use the dictionary registry to resolve a url', async () => {
    const dictUrl: string = await (DictionaryService as any).resolveDictionary(
      NETWORK_FAMILY.ethereum,
      1,
      'https://github.com/subquery/templates/raw/main/dictionary.json'
    );

    expect(dictUrl).toEqual('https://dict-tyk.subquery.network/query/eth-mainnet');
  });
});
