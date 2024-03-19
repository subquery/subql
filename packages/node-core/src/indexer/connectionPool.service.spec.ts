// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {ApiErrorType, ConnectionPoolStateManager, IApiConnectionSpecific, NodeConfig} from '..';
import {ConnectionPoolService} from './connectionPool.service';

async function waitFor(conditionFn: () => boolean, timeout = 50000, interval = 100): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();
    const checkCondition = () => {
      if (conditionFn()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timed out waiting for ${conditionFn.name} after ${timeout}ms`));
      } else {
        setTimeout(checkCondition, interval);
      }
    };
    checkCondition();
  });
}

const mockApiConnection: IApiConnectionSpecific = {
  apiConnect: jest.fn(),
  apiDisconnect: jest.fn(),
  handleError: jest.fn(),
  safeApi: jest.fn(),
  unsafeApi: jest.fn(),
  fetchBlocks: jest.fn(),
  networkMeta: {
    chain: '',
    specName: '',
    genesisHash: '',
  },
};

describe('ConnectionPoolService', () => {
  let connectionPoolService: ConnectionPoolService<typeof mockApiConnection>;
  const nodeConfig: NodeConfig = new NodeConfig({
    batchSize: 1,
    subquery: 'example',
  });

  beforeEach(() => {
    connectionPoolService = new ConnectionPoolService<typeof mockApiConnection>(
      nodeConfig,
      new ConnectionPoolStateManager()
    );
    connectionPoolService.addToConnections(mockApiConnection, 'https://example.com/api');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleApiDisconnects', () => {
    it('should handle successful reconnection on the first attempt', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.resolve());
      const apiConnectSpy = jest.spyOn(mockApiConnection, 'apiConnect');

      (connectionPoolService as any).handleApiDisconnects('https://example.com/api');

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 1);
      expect(apiConnectSpy).toHaveBeenCalledTimes(1);
      expect(connectionPoolService.numConnections).toBe(1);
    }, 10000);

    it('should handle successful reconnection after multiple attempts', async () => {
      (mockApiConnection.apiConnect as any)
        .mockImplementationOnce(() => Promise.reject(new Error('Reconnection failed')))
        .mockImplementationOnce(() => Promise.reject(new Error('Reconnection failed')))
        .mockImplementation(() => Promise.resolve());

      const apiConnectSpy = jest.spyOn(mockApiConnection, 'apiConnect');

      (connectionPoolService as any).handleApiDisconnects('https://example.com/api');

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 3);
      expect(apiConnectSpy).toHaveBeenCalledTimes(3);
      expect(connectionPoolService.numConnections).toBe(1);
    }, 20000);

    it('should handle failed reconnection after max attempts', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.reject(new Error('Reconnection failed')));
      const apiConnectSpy = jest.spyOn(mockApiConnection, 'apiConnect');

      (connectionPoolService as any).handleApiDisconnects('https://example.com/api');

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 5);
      expect(apiConnectSpy).toHaveBeenCalledTimes(5);
      expect(connectionPoolService.numConnections).toBe(0);
    }, 50000);

    it('should call handleApiDisconnects only once when multiple connection errors are triggered', async () => {
      // Mock apiConnection.apiConnect() to not resolve for a considerable time
      (mockApiConnection.apiConnect as any).mockImplementation(() => delay(10));

      const handleApiDisconnectsSpy = jest.spyOn(connectionPoolService as any, 'handleApiDisconnects');

      // Trigger handleApiError with connection issue twice
      void connectionPoolService.handleApiError('https://example.com/api', {
        name: 'ConnectionError',
        errorType: ApiErrorType.Connection,
        message: 'Connection error',
      });
      void connectionPoolService.handleApiError('https://example.com/api', {
        name: 'ConnectionError',
        errorType: ApiErrorType.Connection,
        message: 'Connection error',
      });

      // Wait for a while to see if handleApiDisconnects gets called multiple times
      await delay(5);

      expect(handleApiDisconnectsSpy).toHaveBeenCalledTimes(1);
    }, 15000);
  });
});
