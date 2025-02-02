// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {delay} from '@subql/common';
import {ApiErrorType, ConnectionPoolStateManager, getLogger, IApiConnectionSpecific, NodeConfig} from '..';
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

const TEST_URL = 'https://example.com/api';

describe('ConnectionPoolService', () => {
  let connectionPoolService: ConnectionPoolService<typeof mockApiConnection>;
  let stateManager: ConnectionPoolStateManager<typeof mockApiConnection>;
  const nodeConfig: NodeConfig = new NodeConfig({
    batchSize: 1,
    subquery: 'example',
  });
  const allConnectionsRemoved = jest.fn(() => {
    /* nothing*/
  });

  beforeEach(async () => {
    stateManager = new ConnectionPoolStateManager(allConnectionsRemoved);
    connectionPoolService = new ConnectionPoolService<typeof mockApiConnection>(nodeConfig, stateManager);
    await connectionPoolService.addToConnections(mockApiConnection, TEST_URL);
  });

  afterEach(async () => {
    // Clean up timeouts/intervals
    await Promise.all([stateManager.onApplicationShutdown(), connectionPoolService.onApplicationShutdown()]);
    jest.clearAllMocks();
  });

  describe('handleApiDisconnects', () => {
    it('should handle successful reconnection on the first attempt', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.resolve());
      const apiConnectSpy = jest.spyOn(mockApiConnection, 'apiConnect');

      (connectionPoolService as any).handleApiDisconnects(TEST_URL);

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

      (connectionPoolService as any).handleApiDisconnects(TEST_URL);

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 3);
      expect(apiConnectSpy).toHaveBeenCalledTimes(3);
      expect(connectionPoolService.numConnections).toBe(1);
    }, 20000);

    it('should handle failed reconnection after max attempts', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.reject(new Error('Reconnection failed')));
      const apiConnectSpy = jest.spyOn(mockApiConnection, 'apiConnect');

      (connectionPoolService as any).handleApiDisconnects(TEST_URL);

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 5);
      expect(apiConnectSpy).toHaveBeenCalledTimes(5);
      expect(connectionPoolService.numConnections).toBe(0);

      // Application would exit under normal circumstances as there is only one connection
      expect(allConnectionsRemoved).toHaveBeenCalledTimes(1);
    }, 50000);

    it('should call handleApiDisconnects only once when multiple connection errors are triggered', async () => {
      // Create another connection to remove a special case, TODO fix this weird behaviour
      await connectionPoolService.addToConnections(mockApiConnection, `${TEST_URL}/2`);
      // Mock apiConnection.apiConnect() to not resolve for a considerable time
      (mockApiConnection.apiConnect as any).mockImplementation(() => delay(10));

      const handleApiDisconnectsSpy = jest.spyOn(connectionPoolService as any, 'handleApiDisconnects');

      // Trigger handleApiError with connection issue twice
      void connectionPoolService.handleApiError(TEST_URL, {
        name: 'ConnectionError',
        errorType: ApiErrorType.Connection,
        message: 'Connection error',
      });
      void connectionPoolService.handleApiError(TEST_URL, {
        name: 'ConnectionError',
        errorType: ApiErrorType.Connection,
        message: 'Connection error',
      });

      // Wait for a while to see if handleApiDisconnects gets called multiple times
      await delay(5);

      expect(handleApiDisconnectsSpy).toHaveBeenCalledTimes(1);
    }, 15000);
  });

  describe('Rate limit endpoint delay', () => {
    it('call delay', async () => {
      const logger = getLogger('connection-pool');
      const consoleSpy = jest.spyOn(logger, 'info');

      await connectionPoolService.addToConnections(mockApiConnection, TEST_URL);
      await connectionPoolService.addToConnections(mockApiConnection, `${TEST_URL}/2`);
      await connectionPoolService.handleApiError(TEST_URL, {
        name: 'timeout',
        errorType: ApiErrorType.Timeout,
        message: 'timeout error',
      });
      await connectionPoolService.handleApiError(`${TEST_URL}/2`, {
        name: 'DefaultError',
        errorType: ApiErrorType.Default,
        message: 'Default error',
      });
      await (connectionPoolService as any).flushResultCache();

      await connectionPoolService.api.fetchBlocks([34365]);

      expect(consoleSpy).toHaveBeenCalledWith('throtling on ratelimited endpoint 10s');
      consoleSpy.mockRestore();
    }, 30000);
  });
});
