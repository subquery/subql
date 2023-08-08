// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiConnectionError, ApiErrorType } from '@subql/node-core';
import { StellarBlock, StellarBlockWrapper } from '@subql/types-stellar';
import EventEmitter2 from 'eventemitter2';
import { StellarApiConnection } from './api.connection';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';

const HTTP_ENDPOINT = 'https://rpc-futurenet.stellar.org:443';

describe('StellarApiConnection', () => {
  let apiConnection: StellarApiConnection;
  let unsafeApi: StellarApi;
  const mockBlocks: StellarBlock[] = [
    {
      ledger: 1,
      hash: 'hash1',
      events: [],
    },
    {
      ledger: 2,
      hash: 'hash2',
      events: [],
    },
  ];

  const mockBlockWrappers = mockBlocks.map((_block) => {
    return { block: _block, events: [] } as StellarBlockWrapper;
  });

  const fetchBlockBatches = jest.fn().mockResolvedValue(mockBlockWrappers);

  beforeEach(async () => {
    unsafeApi = new StellarApi(HTTP_ENDPOINT, new EventEmitter2());
    await unsafeApi.init();
    apiConnection = new StellarApiConnection(unsafeApi, fetchBlockBatches);
  });

  it('calling apiConnect throws error', async () => {
    await expect(apiConnection.apiConnect()).rejects.toThrow();
  });

  it('calling apiDisconnect throws error', async () => {
    await expect(apiConnection.apiDisconnect()).rejects.toThrow();
  });

  it('should fetch blocks', async () => {
    const result = await apiConnection.fetchBlocks([1, 2]);
    expect(result).toEqual(mockBlockWrappers);
    expect(fetchBlockBatches).toHaveBeenCalledWith(
      apiConnection.unsafeApi,
      [1, 2],
    );
  });

  it('should safely provide API at a given height', () => {
    const height = 10;
    const safeApi = apiConnection.safeApi(height);
    expect(safeApi).toBeInstanceOf(SafeStellarProvider);
  });

  describe('Error handling', () => {
    it('should handle timeout errors', () => {
      const error = new Error('Timeout');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.Timeout);
    });

    it('should handle disconnection errors', () => {
      const error = new Error('disconnected from ');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.Connection);
    });

    it('should handle rate limit errors', () => {
      const error = new Error('Rate Limit Exceeded');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.RateLimit);
    });

    it('should handle large response errors', () => {
      const error = new Error('limit must not exceed');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.Default);
    });
  });
});
