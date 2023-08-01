// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  ApiConnectionError,
  ApiErrorType,
  DisconnectionError,
  LargeResponseError,
  RateLimitError,
  TimeoutError,
} from '@subql/node-core';
import { SorobanBlock, SorobanBlockWrapper } from '@subql/types-soroban';
import EventEmitter2 from 'eventemitter2';
import { SorobanApiConnection } from './api.connection';
import { SorobanApi } from './api.soroban';
import SafeSorobanProvider from './safe-api';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';

describe('SorobanApiConnection', () => {
  let apiConnection: SorobanApiConnection;
  let unsafeApi: SorobanApi;
  const mockBlocks: SorobanBlockWrapper[] = [
    {
      block: { sequence: 1, hash: 'hash1' } as unknown as SorobanBlock,
      transactions: [],
      operations: [],
      effects: [],
    },
    {
      block: { sequence: 2, hash: 'hash2' } as unknown as SorobanBlock,
      transactions: [],
      operations: [],
      effects: [],
    },
  ];

  const fetchBlockBatches = jest.fn().mockResolvedValue(mockBlocks);

  beforeEach(async () => {
    unsafeApi = new SorobanApi(HTTP_ENDPOINT, new EventEmitter2());
    await unsafeApi.init();
    apiConnection = new SorobanApiConnection(unsafeApi, fetchBlockBatches);
  });

  it('creates a connection', async () => {
    expect(
      await SorobanApiConnection.create(
        HTTP_ENDPOINT,
        fetchBlockBatches,
        new EventEmitter2(),
      ),
    ).toBeInstanceOf(SorobanApiConnection);
  });

  it('fetches blocks', async () => {
    const result = await apiConnection.fetchBlocks([1, 2]);
    expect(result).toEqual(mockBlocks);
    expect(fetchBlockBatches).toHaveBeenCalledWith(unsafeApi, [1, 2]);
  });

  describe('Error handling', () => {
    it('handles timeout errors', () => {
      const error = new Error('Timeout');
      const handledError = SorobanApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(TimeoutError);
    });

    it('handles disconnection errors', () => {
      const error = new Error('disconnected from ');
      const handledError = SorobanApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(DisconnectionError);
    });

    it('handles rate limit errors', () => {
      const error = new Error('Rate Limit Exceeded');
      const handledError = SorobanApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(RateLimitError);
    });

    it('handles large response errors', () => {
      const error = new Error('limit must not exceed');
      const handledError = SorobanApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(LargeResponseError);
    });

    it('handles default errors', () => {
      const error = new Error('default error');
      const handledError = SorobanApiConnection.handleError(error);
      expect(handledError).toBeInstanceOf(ApiConnectionError);
      expect(handledError.errorType).toEqual(ApiErrorType.Default);
    });
  });
});
