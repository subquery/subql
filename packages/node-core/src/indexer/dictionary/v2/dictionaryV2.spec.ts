// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NodeConfig} from '../../../configure';
import {TestDictionaryV2, dsMap as mockedDsMap} from '../dictionary.fixtures';

jest.setTimeout(50000);

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  dictionaryTimeout: 10,
});

describe('Individual dictionary V2 test', () => {
  const dictionary = new TestDictionaryV2('http://mock-dictionary-v2/rpc', '0x21121', nodeConfig);

  beforeAll(async () => {
    await dictionary.mockInit();
  });

  it('can init metadata and set start height', async () => {
    await (dictionary as any).init();
    expect((dictionary as any)._metadata).toBeDefined();
    expect((dictionary as any)._metadata.start).toBe(1);
  }, 500000);

  it('should get correct getQueryEndBlock', async () => {
    await (dictionary as any).init();
    // should use targeted query end height, start height + batch size
    const queryEndBlock1 = dictionary.getQueryEndBlock(1000, 1000000);
    expect(queryEndBlock1).toBe(1000);

    // should use dictionary metadata end, mock that api and targetHeight are beyond dictionary metadata
    const queryEndBlock2 = dictionary.getQueryEndBlock(10000000000, 10000000000);
    expect(queryEndBlock2).toBe((dictionary as any)._metadata.end);
  }, 500000);

  it('can get data', async () => {
    await (dictionary as any).init();
    dictionary.updateQueriesMap(mockedDsMap);
    // mock api return
    (dictionary as any).dictionaryApi = {
      post: () => {
        return {
          status: 200,
          data: {
            result: {
              blocks: [105, 205, 600, 705],
              blockRange: ['0x1', '0xF4240'],
              genesisHash: 'mockedGenesisHash',
            },
          },
        };
      },
    };

    const data = await dictionary.getData(100, 1100, 100, {event: {}, method: {}});
    expect(data?.batchBlocks).toStrictEqual([105, 205, 600, 705]);
    expect(data?.lastBufferedHeight).toBe(705);
    // can update metadata block height
    expect((dictionary as any).metadata.end).toBe(1000000);

    // can throw error if response failed
    (dictionary as any).dictionaryApi = {
      post: () => {
        throw new Error('Mock post error');
      },
    };
    await expect(() => dictionary.getData(100, 1100, 100, {event: {}, method: {}})).rejects.toThrow(
      'Dictionary query failed Error: Mock post error'
    );

    jest.clearAllMocks();
  }, 500000);

  it('can determine current dictionary query map is valid with block height', async () => {
    await (dictionary as any).init();
    dictionary.updateQueriesMap(mockedDsMap);
    expect(dictionary.queryMapValidByHeight(105)).toBeTruthy();
    expect(dictionary.queryMapValidByHeight(1)).toBeFalsy();
  });

  it('should able to handle convertResponseBlocks return empty array blocks and lastBufferedHeight is undefined', async () => {
    await (dictionary as any).init();
    dictionary.updateQueriesMap(mockedDsMap);
    // mock api return
    (dictionary as any).dictionaryApi = {
      post: () => {
        return {
          status: 200,
          data: {
            result: {
              blocks: [105, 205, 600, 705],
              BlockRange: [1, 1000000],
              GenesisHash: 'mockedGenesisHash',
            },
          },
        };
      },
    };
    // mock convertResponseBlocks
    (dictionary as any).convertResponseBlocks = () => {
      return {
        batchBlocks: [],
        lastBufferedHeight: undefined,
      };
    };
    const data = await dictionary.getData(1001, 2001, 100, {event: {}, method: {}});
    expect(data?.lastBufferedHeight).toBe(2001);
    jest.clearAllMocks();
  });
});

describe('determine dictionary V2 version', () => {
  it('if not supported dictionary endpoint, v2 should throw error if init failed', async () => {
    const dictionaryV2 = new TestDictionaryV2(
      'https://dict-tyk.subquery.network/query/eth-mainnet/rpc',
      '0x21121',
      nodeConfig
    );
    await expect((dictionaryV2 as any).init()).rejects.toThrow();
  });
});
