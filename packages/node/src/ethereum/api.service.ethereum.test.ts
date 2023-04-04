// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ConnectionPoolService, delay, NodeConfig } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApiService } from './api.service.ethereum';

// Add api key to work
const WS_ENDPOINT = 'wss://eth.api.onfinality.io/ws?apikey=';
const HTTP_ENDPOINT = 'https://eth.api.onfinality.io/public';

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

const prepareApiService = async (
  endpoint: string = HTTP_ENDPOINT,
): Promise<[EthereumApiService, INestApplication]> => {
  const module = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      {
        provide: NodeConfig,
        useFactory: () => ({}),
      },
      {
        provide: 'ISubqueryProject',
        useFactory: () => testSubqueryProject(endpoint),
      },
      EthereumApiService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  const apiService = app.get(EthereumApiService);
  await apiService.init();
  return [apiService, app];
};

jest.setTimeout(90000);
describe('ApiService', () => {
  let apiService: EthereumApiService;
  let app: INestApplication;

  beforeEach(async () => {
    [apiService, app] = await prepareApiService();
  });

  afterEach(async () => {
    return app?.close();
  });

  it('can instantiate api', async () => {
    console.log(apiService.api.getChainId());
    await delay(0.5);
  });

  it('can fetch blocks', async () => {
    await apiService.api.fetchBlocks(range(12369621, 12369651));
    await delay(0.5);
  });

  it('can get the finalized height', async () => {
    const height = await apiService.api.getFinalizedBlockHeight();

    console.log('Finalized height', height);
    expect(height).toBeGreaterThan(16_000_000);
  });
});
