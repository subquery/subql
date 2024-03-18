// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {NETWORK_FAMILY} from '@subql/common';
import {NodeConfig} from '../..';
import {DictionaryService} from './dictionary.service';
import {dsMap as mockedDsMap, TestDictionaryV1} from './v1/dictionaryV1.test';
import {TestDictionaryV2, TestFB, patchMockDictionary} from './v2/dictionaryV2.test';

class TestDictionaryService extends DictionaryService<any, TestFB> {
  async initDictionaries(): Promise<void> {
    // Mock version inspection completed
    const dictionaryV1Endpoints = [
      'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
      'https://dict-tyk.subquery.network/query/eth-mainnet',
    ];

    const dictionariesV1 = await Promise.all(
      dictionaryV1Endpoints.map(
        (endpoint) => new TestDictionaryV1(endpoint, 'mockChainId', this.nodeConfig, this.eventEmitter)
      )
    );
    const mockDictionaryV2 = new TestDictionaryV2(
      'http://mock-dictionary-v2/rpc',
      'mockChainId',
      this.nodeConfig,
      this.eventEmitter
    );

    patchMockDictionary(mockDictionaryV2);
    const dictionariesV2 = [mockDictionaryV2];
    this.init([...dictionariesV1, ...dictionariesV2]);
  }
}

describe('Dictionary service', function () {
  let dictionaryService: TestDictionaryService;

  beforeEach(async () => {
    const nodeConfig = new NodeConfig({
      subquery: 'dictionaryService',
      subqueryName: 'asdf',
      networkEndpoint: ['wss://eth.api.onfinality.io/public-ws'],
      dictionaryTimeout: 10,
      networkDictionary: [
        'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
        'https://dict-tyk.subquery.network/query/eth-mainnet',
        'http://mock-dictionary-v2/rpc',
      ],
    });

    dictionaryService = new TestDictionaryService('0xchainId', nodeConfig, new EventEmitter2());
    await dictionaryService.initDictionaries();

    dictionaryService.buildDictionaryEntryMap(mockedDsMap);
    await Promise.all((dictionaryService as any)._dictionaries.map((d: any) => d.init()));
  });

  afterAll(() => dictionaryService.onApplicationShutdown());

  it('can use the dictionary registry to resolve a url', async () => {
    const dictUrl: string = await (dictionaryService as any).resolveDictionary(
      NETWORK_FAMILY.ethereum,
      1,
      'https://github.com/subquery/templates/raw/main/dist/dictionary.json'
    );

    expect(dictUrl).toEqual(['https://dict-tyk.subquery.network/query/eth-mainnet']);
  });

  it('init Dictionaries with mutiple endpoints, can be valid and non-valid', () => {
    expect((dictionaryService as any)._dictionaries.length).toBe(3);
  });

  it('can find valid dictionary with height', () => {
    // If we haven't set dictionary
    expect((dictionaryService as any)._currentDictionaryIndex).toBeUndefined();

    (dictionaryService as any).findDictionary(100, new Set<number>());
    expect((dictionaryService as any)._currentDictionaryIndex).toBe(1);

    expect((dictionaryService as any).getDictionary(100)).toBeTruthy();
    // Current only valid endpoint been provided
    expect((dictionaryService as any).getDictionary(100).dictionaryEndpoint).toBe(
      'https://dict-tyk.subquery.network/query/eth-mainnet'
    );

    expect(dictionaryService.useDictionary(100)).toBeTruthy();
  });

  it('scopedDictionaryEntries, dictionary get data should be called', async () => {
    const dictionary = (dictionaryService as any).getDictionary(1000);

    const spyDictionary = jest.spyOn(dictionary, 'getData');

    await dictionaryService.scopedDictionaryEntries(1000, 11000, 100);
    expect(spyDictionary).toHaveBeenCalled();
  });

  it('scopedDictionaryEntries, if query failed/timeout, should try next valid dictionary for query', async () => {
    // mock current dictionary,  it is an invalid dictionary, should allow scopedDictionaryEntries to find next dictionary
    (dictionaryService as any)._currentDictionaryIndex = 0;
    const failedDictionary = (dictionaryService as any)._dictionaries[0];
    // mock this dictionary can pass validation
    failedDictionary._metadata = {lastProcessedHeight: 10000};
    // (dictionaryService as any)._dictionaries[0].heightValidation= (height:number) => true;
    failedDictionary.getData = () => {
      throw new Error('Dictionary index 0 mock fetch failed');
    };
    const spyFailedGetData = jest.spyOn(failedDictionary, 'getData');

    const passDictionary = (dictionaryService as any)._dictionaries[1];

    const spyPassGetData = jest.spyOn(passDictionary, 'getData');

    const spyScopedDictionaryEntries = jest.spyOn(dictionaryService as any, '_scopedDictionaryEntries');

    await dictionaryService.scopedDictionaryEntries(1000, 11000, 100);
    expect(spyFailedGetData).toHaveBeenCalledTimes(1);
    expect(spyPassGetData).toHaveBeenCalledTimes(1);
    // failed 1 time + 1 retry
    expect(spyScopedDictionaryEntries).toHaveBeenCalledTimes(2);
    expect((dictionaryService as any)._currentDictionaryIndex).toBe(1);
  }, 5000000);

  it('tried all dictionaries but all failed will return undefined', async () => {
    // remove the valid dictionary
    (dictionaryService as any)._currentDictionaryIndex = 0;
    const failedDictionary = (dictionaryService as any)._dictionaries[0];
    // mock this dictionary can pass validation
    for (const dictionary of (dictionaryService as any)._dictionaries) {
      dictionary._metadata = {lastProcessedHeight: 10000};
      dictionary.getData = () => {
        throw new Error('Dictionary fetch failed');
      };
    }
    const spyScopedDictionaryEntries = jest.spyOn(dictionaryService as any, '_scopedDictionaryEntries');
    const blocks = await dictionaryService.scopedDictionaryEntries(1000, 11000, 100);
    expect(spyScopedDictionaryEntries).toHaveBeenCalledTimes(3);
    expect(blocks).toBeUndefined();
  }, 50000);
});
