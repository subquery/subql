// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {DictionaryResponse, DictionaryV2, DictionaryV2QueryEntry, RawDictionaryResponseData} from '../';
import {NodeConfig} from '../../../configure';
import {IBlock} from '../../types';

jest.setTimeout(50000);

// eslint-disable-next-line jest/no-export
export interface TestFB {
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
}

// eslint-disable-next-line jest/no-export
export class TestDictionaryV2 extends DictionaryV2<TestFB, any, any> {
  buildDictionaryQueryEntries(dataSources: any[]): DictionaryV2QueryEntry {
    return {};
  }
  async getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number
  ): Promise<DictionaryResponse<IBlock<TestFB>> | undefined> {
    return Promise.resolve(undefined);
  }

  convertResponseBlocks<RFB>(result: RawDictionaryResponseData<RFB>): DictionaryResponse<IBlock<TestFB>> | undefined {
    return undefined;
  }
}
// mock init and metadata
// eslint-disable-next-line jest/no-export
export function patchMockDictionary(dictionary: DictionaryV2<any, any>) {
  (dictionary as any).init = () => {
    ((dictionary as any)._metadata = {
      start: 1,
      end: 100000,
      genesisHash: '0x21121',
      filters: {
        complete: ['block', 'transaction'],
      },
      supported: ['complete'],
    }),
      (dictionary as any).setDictionaryStartHeight((dictionary as any)._metadata.start);
  };
}

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  dictionaryTimeout: 10,
  dictionaryResolver: false,
});
describe('Individual dictionary V2 test', () => {
  const dictionary = new TestDictionaryV2('http://mock-dictionary-v2/rpc', '0x21121', nodeConfig, new EventEmitter2());
  patchMockDictionary(dictionary);
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
});

describe('determine dictionary V2 version', () => {
  it('if not supported dictionary endpoint, v2 should throw error if init failed', async () => {
    const dictionaryV2 = new TestDictionaryV2(
      'https://dict-tyk.subquery.network/query/eth-mainnet/rpc',
      '0x21121',
      nodeConfig,
      new EventEmitter2()
    );
    await expect((dictionaryV2 as any).init()).rejects.toThrow();
  });
});
