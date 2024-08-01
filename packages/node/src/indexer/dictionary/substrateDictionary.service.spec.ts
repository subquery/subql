// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';

import { NodeConfig } from '@subql/node-core';
import axios from 'axios';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { DsProcessorService } from '../ds-processor.service';
import { SubstrateDictionaryService } from './substrateDictionary.service';
import { SubstrateDictionaryV1 } from './v1';
import { SubstrateDictionaryV2 } from './v2';

function testSubqueryProject(
  endpoint: string[],
  chainId: string,
): SubqueryProject {
  return {
    id: 'test',
    root: './',
    network: {
      endpoint,
      dictionary: ['http://mock-dictionary-v2'],
      chainId: chainId,
    },
    dataSources: [],
    schema: new GraphQLSchema({}),
    templates: [],
  } as unknown as SubqueryProject;
}

// Mock jest and set the type
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Substrate Dictionary service', function () {
  let dictionaryService: SubstrateDictionaryService;

  beforeEach(() => {
    const nodeConfig = new NodeConfig({
      subquery: 'dictionaryService',
      subqueryName: 'asdf',
      networkEndpoint: { 'wss://polkadot.api.onfinality.io/public-ws': {} },
      dictionaryTimeout: 10,
      networkDictionary: ['http://mock-dictionary-v2'],
      dictionaryRegistry: 'false',
    });
    const project = testSubqueryProject(
      ['wss://polkadot.api.onfinality.io/public-ws'],
      '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    );
    const dsProcessor = new DsProcessorService(project, nodeConfig);

    dictionaryService = new SubstrateDictionaryService(
      project,
      nodeConfig,
      new EventEmitter2(),
      dsProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should use v1 if v2 init failed, can determine dictionary version by init dictionary', async () => {
    const spyDictionaryV1Create = jest.spyOn(SubstrateDictionaryV1, 'create');
    const spyDictionaryV2Create = jest.spyOn(SubstrateDictionaryV2, 'create');

    await dictionaryService.initDictionaries();
    expect(spyDictionaryV2Create).toHaveBeenCalledTimes(1);
    expect(spyDictionaryV1Create).toHaveBeenCalledTimes(1);
    expect(
      (dictionaryService as any)._dictionaries.every(
        (d: any) => d instanceof SubstrateDictionaryV1,
      ),
    ).toBeTruthy();
  });

  it('should use v2 if init passed', async () => {
    const spyDictionaryV1Create = jest.spyOn(SubstrateDictionaryV1, 'create');
    const mockedResponseData = {
      result: {
        availableBlocks: [{ startHeight: 1, endHeight: 10 }],
        genesisHash: 'mockedGenesisHash',
        filters: ['block', 'event'],
        supportedResponses: ['complete'],
      },
    };
    // @ts-ignore
    mockedAxios.create.mockImplementation(() => {
      return {
        post: () => {
          return {
            status: 200,
            data: mockedResponseData,
          };
        },
      };
    });

    await dictionaryService.initDictionaries();
    expect(spyDictionaryV1Create).toHaveBeenCalledTimes(0);
    expect(
      (dictionaryService as any)._dictionaries[0] instanceof
        SubstrateDictionaryV2,
    ).toBeTruthy();
  });
});
