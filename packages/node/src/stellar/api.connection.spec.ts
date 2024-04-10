// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  ApiConnectionError,
  ApiErrorType,
  DisconnectionError,
  LargeResponseError,
  RateLimitError,
  TimeoutError,
} from '@subql/node-core';
import { StellarBlock, StellarBlockWrapper } from '@subql/types-stellar';
import EventEmitter2 from 'eventemitter2';
import { StellarApiConnection } from './api.connection';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';
const SOROBAN_ENDPOINT = 'https://rpc-futurenet.stellar.org';

describe('StellarApiConnection', () => {
  let apiConnection: StellarApiConnection;
  let unsafeApi: StellarApi;
  let sorobanApi: SorobanServer;
  const mockBlocks: StellarBlockWrapper[] = [
    {
      block: { sequence: 1, hash: 'hash1' } as unknown as StellarBlock,
      transactions: [],
      operations: [],
      effects: [],
    },
    {
      block: { sequence: 2, hash: 'hash2' } as unknown as StellarBlock,
      transactions: [],
      operations: [],
      effects: [],
    },
  ];

  const fetchBlockBatches = jest.fn().mockResolvedValue(mockBlocks);

  beforeEach(async () => {
    sorobanApi = new SorobanServer(SOROBAN_ENDPOINT);
    unsafeApi = new StellarApi(HTTP_ENDPOINT, new EventEmitter2(), sorobanApi);
    await unsafeApi.init();
    apiConnection = new StellarApiConnection(unsafeApi, fetchBlockBatches);
  });

  it('creates a connection', async () => {
    expect(
      await StellarApiConnection.create(
        HTTP_ENDPOINT,
        fetchBlockBatches,
        new EventEmitter2(),
        sorobanApi,
      ),
    ).toBeInstanceOf(StellarApiConnection);
  });

  it('fetches blocks', async () => {
    const result = await apiConnection.fetchBlocks([1, 2]);
    expect(result).toEqual(mockBlocks);
    expect(fetchBlockBatches).toHaveBeenCalledWith(unsafeApi, [1, 2]);
  });

  describe('Error handling', () => {
    it('handles timeout errors', () => {
      const error = new Error('Timeout');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(TimeoutError);
    });

    it('handles disconnection errors', () => {
      const error = new Error('disconnected from ');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(DisconnectionError);
    });

    it('handles rate limit errors', () => {
      const error = new Error('Rate Limit Exceeded');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(RateLimitError);
    });

    it('handles large response errors', () => {
      const error = new Error('limit must not exceed');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(LargeResponseError);
    });

    it('handles default errors', () => {
      const error = new Error('default error');
      const handledError = StellarApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.Default);
    });
  });
});
