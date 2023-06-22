// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IApiConnectionSpecific} from '..';
import {ConnectionPoolService} from './connectionPool.service';

async function waitFor(conditionFn: () => boolean, timeout = 30000, interval = 100): Promise<void> {
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

  beforeEach(() => {
    connectionPoolService = new ConnectionPoolService<typeof mockApiConnection>();
    connectionPoolService.addToConnections(mockApiConnection, 'https://example.com/api');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleApiDisconnects', () => {
    it('should handle successful reconnection on the first attempt', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.resolve());

      connectionPoolService.handleApiDisconnects(0);

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 1);
      expect(mockApiConnection.apiConnect).toHaveBeenCalledTimes(1);
      expect(connectionPoolService.numConnections).toBe(1);
    }, 10000);

    it('should handle successful reconnection after multiple attempts', async () => {
      (mockApiConnection.apiConnect as any)
        .mockImplementationOnce(() => Promise.reject(new Error('Reconnection failed')))
        .mockImplementationOnce(() => Promise.reject(new Error('Reconnection failed')))
        .mockImplementation(() => Promise.resolve());

      connectionPoolService.handleApiDisconnects(0);

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 3);
      expect(mockApiConnection.apiConnect).toHaveBeenCalledTimes(3);
      expect(connectionPoolService.numConnections).toBe(1);
    }, 20000);

    it('should handle failed reconnection after max attempts', async () => {
      (mockApiConnection.apiConnect as any).mockImplementation(() => Promise.reject(new Error('Reconnection failed')));

      connectionPoolService.handleApiDisconnects(0);

      await waitFor(() => (mockApiConnection.apiConnect as any).mock.calls.length === 5);
      expect(mockApiConnection.apiConnect).toHaveBeenCalledTimes(5);
      expect(connectionPoolService.numConnections).toBe(0);
    }, 31000);
  });
});
