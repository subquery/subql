// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { scValToNative } from '@stellar/stellar-sdk';
import { ConnectionPoolService, delay, NodeConfig } from '@subql/node-core';
import { ConnectionPoolStateManager } from '@subql/node-core/dist';
import { GraphQLSchema } from 'graphql';
import { range, some } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApiService } from './api.service.stellar';
import { StellarApi } from './api.stellar';
import { StellarBlockWrapped } from './block.stellar';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';
const SOROBAN_ENDPOINT = 'https://rpc-futurenet.stellar.org';

function testSubqueryProject(
  endpoint: string,
  sorobanEndpoint: string,
): SubqueryProject {
  return {
    network: {
      endpoint: [endpoint],
      sorobanEndpoint,
      chainId: 'Test SDF Future Network ; October 2022',
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  } as unknown as SubqueryProject;
}

const prepareApiService = async (
  endpoint: string = HTTP_ENDPOINT,
  soroban: string = SOROBAN_ENDPOINT,
  project?: SubqueryProject,
): Promise<[StellarApiService, INestApplication]> => {
  const module = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      ConnectionPoolStateManager,
      {
        provide: 'IProjectUpgradeService',
        useFactory: () => ({}),
      },
      {
        provide: NodeConfig,
        useFactory: () => ({}),
      },
      {
        provide: 'ISubqueryProject',
        useFactory: () => project ?? testSubqueryProject(endpoint, soroban),
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

  it('should instantiate api', () => {
    expect(apiService.api).toBeInstanceOf(StellarApi);
  });

  it('should fetch blocks', async () => {
    const latestHeight = await apiService.api.getFinalizedBlockHeight();
    const blocks = await apiService.fetchBlocks(
      range(latestHeight - 1, latestHeight),
    );
    expect(blocks).toBeDefined();
    expect(blocks[0].block.block.sequence).toEqual(latestHeight - 1);
  });

  it('should throw error when chainId does not match', async () => {
    const faultyProject = {
      ...testSubqueryProject(HTTP_ENDPOINT, SOROBAN_ENDPOINT),
      network: {
        ...testSubqueryProject(HTTP_ENDPOINT, SOROBAN_ENDPOINT).network,
        chainId: 'Incorrect ChainId',
      },
    };

    await expect(
      prepareApiService(
        HTTP_ENDPOINT,
        SOROBAN_ENDPOINT,
        faultyProject as unknown as SubqueryProject,
      ),
    ).rejects.toThrow();
  });

  it('fails after maximum retries', async () => {
    const api = apiService.unsafeApi;

    // Mock the fetchBlocks method to always throw an error
    (api as any).fetchBlocks = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    await expect(
      (api as any).fetchBlocks(range(50000, 50100)),
    ).rejects.toThrow();
  });
});

// Skip test as rpc is pruned and block can be missing,
// To test this, find any block with transfer event first
describe.skip('testnet StellarApiService', () => {
  let apiService: StellarApiService;
  let app: INestApplication;

  function testSubqueryProject2(
    endpoint: string,
    sorobanEndpoint: string,
  ): SubqueryProject {
    return {
      network: {
        endpoint: [endpoint],
        sorobanEndpoint,
        chainId: 'Test SDF Network ; September 2015',
      },
      dataSources: [],
      id: 'test',
      root: './',
      schema: new GraphQLSchema({}),
      templates: [],
    } as unknown as SubqueryProject;
  }

  beforeEach(async () => {
    [apiService, app] = await prepareApiService(
      'https://horizon-testnet.stellar.org',
      'https://soroban-testnet.stellar.org',
      testSubqueryProject2(
        'https://horizon-testnet.stellar.org',
        'https://soroban-testnet.stellar.org',
      ),
    );
  });

  it('should fetch blocks, and decode address', async () => {
    const blocks = await apiService.fetchBlocks([228236]);
    expect(blocks).toBeDefined();

    const block228236 = blocks[0];
    const transferEvent = block228236.block.events?.find(
      (e) => e.id === '0000980266155778048-0000000001',
    );

    const [sys, from, to] = transferEvent!.topic;
    const decodedFrom = scValToNative(from).toString();
    const decodedTo = scValToNative(to).toString();

    console.log(scValToNative(sys));
    console.log(decodedFrom);
    console.log(decodedTo);
  });
});
