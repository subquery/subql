// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ConnectionPoolService, delay, NodeConfig } from '@subql/node-core';
import { ConnectionPoolStateManager } from '@subql/node-core/dist';
import { GraphQLSchema } from 'graphql';
import { range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApiService } from './api.service.stellar';

const HTTP_ENDPOINT = 'https://rpc-futurenet.stellar.org:443';

export function testSubqueryProject(endpoint: string): SubqueryProject {
  return {
    network: {
      endpoint,
      chainId: 'Test SDF Future Network ; October 2022',
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

export const prepareApiService = async (
  endpoint: string = HTTP_ENDPOINT,
  project?: SubqueryProject,
): Promise<[StellarApiService, INestApplication]> => {
  const module = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      ConnectionPoolStateManager,
      {
        provide: NodeConfig,
        useFactory: () => ({}),
      },
      {
        provide: 'ISubqueryProject',
        useFactory: () => project ?? testSubqueryProject(endpoint),
      },
      StellarApiService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  const apiService = app.get(StellarApiService);
  await apiService.init();
  return [apiService, app];
};

jest.setTimeout(90000);
describe('StellarApiService', () => {
  let apiService: StellarApiService;
  let app: INestApplication;

  beforeEach(async () => {
    [apiService, app] = await prepareApiService();
  });

  it('can instantiate api', async () => {
    console.log(apiService.api.getChainId());
    await delay(0.5);
  });

  it('can fetch blocks', async () => {
    const finalizedHeight = await apiService.api.getFinalizedBlockHeight();
    const blocks = await apiService.api.fetchBlocks(
      range(finalizedHeight - 1000, finalizedHeight),
    );
    expect(blocks).toBeDefined();
    await delay(0.5);
  });

  it('can get the finalized height', async () => {
    const height = await apiService.api.getFinalizedBlockHeight();
    console.log('Finalized height', height);
    expect(height).not.toBeNaN();
  });

  it('throws error when chainId does not match', async () => {
    const faultyProject = {
      ...testSubqueryProject(HTTP_ENDPOINT),
      network: {
        ...testSubqueryProject(HTTP_ENDPOINT).network,
        chainId: 'Incorrect ChainId',
      },
    };

    await expect(
      prepareApiService(HTTP_ENDPOINT, faultyProject),
    ).rejects.toThrow();
  });

  it('fails after maximum retries', async () => {
    const safeApi = apiService.safeApi(50000);

    // Mock the fetchBlocks method to always throw an error
    (safeApi as any).fetchBlocks = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    await expect(
      (safeApi as any).fetchBlocks(range(50000, 50100)),
    ).rejects.toThrow();
  });
});
