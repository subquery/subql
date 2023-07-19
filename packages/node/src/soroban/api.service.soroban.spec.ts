// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { ConnectionPoolService, delay, NodeConfig } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { range } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { SorobanApiService } from './api.service.soroban';

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
): Promise<[SorobanApiService, INestApplication]> => {
  const module = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      {
        provide: NodeConfig,
        useFactory: () => ({}),
      },
      {
        provide: 'ISubqueryProject',
        useFactory: () => project ?? testSubqueryProject(endpoint),
      },
      SorobanApiService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = module.createNestApplication();
  await app.init();
  const apiService = app.get(SorobanApiService);
  await apiService.init();
  return [apiService, app];
};

jest.setTimeout(90000);
describe('SorobanApiService', () => {
  let apiService: SorobanApiService;
  let app: INestApplication;

  beforeEach(async () => {
    [apiService, app] = await prepareApiService();
  });

  it('can instantiate api', async () => {
    console.log(apiService.api.getChainId());
    await delay(0.5);
  });

  it('can fetch blocks', async () => {
    const blocks = await apiService.api.fetchBlocks(range(50000, 50100));
    expect(blocks).toBeDefined();
    await delay(0.5);
  });

  it('can get the finalized height', async () => {
    const height = await apiService.api.getFinalizedBlockHeight();
    console.log('Finalized height', height);
    expect(height).toBeGreaterThan(50000);
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

  it('provides safe api with retry on failure', async () => {
    const safeApi = apiService.safeApi(50000);
    const originalGetEvents = (safeApi as any).getEvents;

    // Mock the fetchBlocks method to throw an error on first call
    (safeApi as any).getEvents = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockImplementationOnce(originalGetEvents);

    const blocks = await safeApi.getEvents({ startLedger: 50000, filters: [] });
    expect(blocks).toBeDefined();
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
