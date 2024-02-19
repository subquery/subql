// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {NETWORK_FAMILY} from '@subql/common';
import {IBlock} from '@subql/types-core';
import {NodeConfig} from '../..';
import {DictionaryService} from './dictionary.service';
import {DictionaryResponse} from './types';
import {testDictionaryV1} from './v1/dictionaryV1.test';
import {DictionaryV2, DictionaryV2QueryEntry} from './v2';

interface testFB {
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
}

class testDictionaryV2 extends DictionaryV2<testFB, any, any> {
  buildDictionaryQueryEntries(dataSources: any[]): DictionaryV2QueryEntry {
    return {};
  }

  async getData(
    startBlock: number,
    queryEndBlock: number,
    limit: number
  ): Promise<DictionaryResponse<IBlock<testFB>> | undefined> {
    return Promise.resolve(undefined);
  }
}

class testDictionaryService extends DictionaryService<any, testFB, any> {
  async initDictionaries(): Promise<void> {
    // Mock version inspection completed
    const dictionaryV1Endpoints = [
      'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
      'https://dict-tyk.subquery.network/query/eth-mainnet',
    ];
    const dictionaryV2Endpoints = ['http://localhost:3000/rpc'];

    const dictionariesV1 = await Promise.all(
      dictionaryV1Endpoints.map(
        (endpoint) => new testDictionaryV1(endpoint, 'mockChainId', this.nodeConfig, this.eventEmitter)
      )
    );
    const dictionariesV2 = dictionaryV2Endpoints.map(
      (endpoint) => new testDictionaryV2(endpoint, 'mockChainId', this.nodeConfig, this.eventEmitter)
    );
    this.init([...dictionariesV1, ...dictionariesV2]);
  }
}

describe('Dictionary service', function () {
  let dictionaryService: testDictionaryService;

  beforeAll(async () => {
    const nodeConfig = new NodeConfig({
      subquery: 'dictionaryService',
      subqueryName: 'asdf',
      networkEndpoint: ['wss://eth.api.onfinality.io/public-ws'],
      dictionaryTimeout: 10,
      dictionaryResolver: false,
      networkDictionary: [
        'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
        'https://dict-tyk.subquery.network/query/eth-mainnet',
        'http://localhost:3000/rpc',
      ],
    });

    dictionaryService = new testDictionaryService('0xchainId', nodeConfig, new EventEmitter2());
    await dictionaryService.initDictionaries();
    await Promise.all((dictionaryService as any)._dictionaries.map((d: any) => d.init()));
  });

  it('can use the dictionary registry to resolve a url', async () => {
    const dictUrl: string = await (dictionaryService as any).resolveDictionary(
      NETWORK_FAMILY.ethereum,
      1,
      'https://github.com/subquery/templates/raw/main/dist/dictionary.json'
    );

    expect(dictUrl).toEqual('https://dict-tyk.subquery.network/query/eth-mainnet');
  });

  it('init Dictionaries with mutiple endpoints, can be valid and non-valid', () => {
    expect((dictionaryService as any)._dictionaries.length).toBe(3);
  });

  it('can find valid dictionary with height', () => {
    // If we haven't set dictionary
    expect((dictionaryService as any)._currentDictionaryIndex).toBeUndefined();

    (dictionaryService as any).findDictionary(1);
    expect((dictionaryService as any)._currentDictionaryIndex).toBe(0);

    expect((dictionaryService as any).getDictionary(1)).toBeTruthy();
    // Current only valid endpoint been provided
    expect((dictionaryService as any).getDictionary(1).dictionaryEndpoint).toBe(
      'https://dict-tyk.subquery.network/query/eth-mainnet'
    );

    expect(dictionaryService.useDictionary(1)).toBeTruthy();
  });

  it('scopedDictionaryEntries, dictionary get data should be called', async () => {
    const dictionary = (dictionaryService as any).getDictionary(1000);

    const spyDictionary = jest.spyOn(dictionary, 'getData');

    const blocks = await dictionaryService.scopedDictionaryEntries(1000, 11000, 100);
    expect(spyDictionary).toHaveBeenCalled();
    expect(blocks).toBeTruthy();
  });
});
