// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {delay} from '@subql/common';
import {IEndpointConfig, ProjectNetworkConfig} from '@subql/types-core';
import {ApiService, IApiConnectionSpecific} from './api.service';
import {NodeConfig} from './configure';
import {ConnectionPoolService, ConnectionPoolStateManager} from './indexer';

class TestApiService extends ApiService {
  retryConnection(
    createConnection: (endpoint: string, config: IEndpointConfig) => Promise<IApiConnectionSpecific>,
    network: ProjectNetworkConfig & {chainId: string},
    index: number,
    endpoint: string,
    config: IEndpointConfig,
    postConnectedHook?: ((connection: IApiConnectionSpecific, endpoint: string, index: number) => void) | undefined
  ): void {
    /* No Op to avoid creating intervals/timeouts in tests*/
  }
}

describe('ApiService', () => {
  let apiService: TestApiService;

  beforeEach(() => {
    const stateManager = new ConnectionPoolStateManager();
    const poolService = new ConnectionPoolService(new NodeConfig({} as any), stateManager);

    apiService = new TestApiService(poolService, new EventEmitter2());
  });

  it('should throw creating connections if all endpoints are invalid', async () => {
    await expect(
      apiService.createConnections(
        {chainId: 'test', endpoint: {fail: {}, fail2: {}}},
        (endpoint) => Promise.resolve({networkMeta: {chain: endpoint}} as any) // Fail meta validation
      )
    ).rejects.toThrow();
  });

  it('should succeed creating connections if one endpoint is invalid', async () => {
    await expect(
      apiService.createConnections(
        {chainId: 'test', endpoint: {test: {}, fail: {}}},
        (endpoint) => Promise.resolve({networkMeta: {chain: endpoint}} as any) // Fail meta validation
      )
    ).resolves.not.toThrow();
  });

  it(`doesn't set network meta if a connection fails validation`, async () => {
    await expect(
      apiService.createConnections({chainId: 'test', endpoint: ['fail']}, (endpoint) =>
        Promise.resolve({networkMeta: {chain: endpoint}} as any)
      )
    ).rejects.toThrow();

    expect((apiService as any)._networkMeta).toBeUndefined();
  });

  it('should retry connections if they fail with something other than metadata', async () => {
    const retrySpy = jest.spyOn(apiService, 'retryConnection');

    await apiService.createConnections({chainId: 'test', endpoint: {test: {}, fail: {}}}, (endpoint) =>
      endpoint === 'test'
        ? Promise.resolve({networkMeta: {chain: endpoint}} as any) // At least one endpoint needs to succeed
        : Promise.reject(new Error('Test'))
    );

    // Add delay so non blocking promise is resolve in create connections
    await delay(0.001);

    expect(retrySpy).toHaveBeenCalled();
  });
});
