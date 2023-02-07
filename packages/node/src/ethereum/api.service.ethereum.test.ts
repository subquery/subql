// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { delay } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiService } from './api.service.ethereum';

// Add api key to work
const WS_ENDPOINT = 'wss://eth.api.onfinality.io/ws?apikey=';
const HTTP_ENDPOINT = 'https://eth.api.onfinality.io/rpc?apikey=';

function testSubqueryProject(endpoint: string): SubqueryProject {
  return {
    network: {
      endpoint,
      chainId: '1',
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

jest.setTimeout(90000);
describe('ApiService', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  const prepareApiService = async (
    endpoint: string = HTTP_ENDPOINT,
  ): Promise<EthereumApiService> => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: 'ISubqueryProject',
          useFactory: () => testSubqueryProject(endpoint),
        },
        EthereumApiService,
      ],
      imports: [EventEmitterModule.forRoot()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const apiService = app.get(EthereumApiService);
    await apiService.init();
    return apiService;
  };

  it('can instantiate api', async () => {
    const apiService = await prepareApiService();
    console.log(apiService.api.getChainId());
    await delay(0.5);
  });

  it('can fetch blocks', async () => {
    const apiService = await prepareApiService();
    await apiService.api.fetchBlocks(range(12369621, 12369651));
    await delay(0.5);
  });
});
