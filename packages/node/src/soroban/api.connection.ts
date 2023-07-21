// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  NetworkMetadataPayload,
} from '@subql/node-core';
import { SorobanBlockWrapper } from '@subql/types-soroban';
import { SorobanApi } from './api.soroban';
import SafeSorobanProvider from './safe-api';

type FetchFunc = (
  api: SorobanApi,
  batch: number[],
) => Promise<SorobanBlockWrapper[]>;

export class SorobanApiConnection
  implements
    IApiConnectionSpecific<
      SorobanApi,
      SafeSorobanProvider,
      SorobanBlockWrapper
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: SorobanApi,
    private fetchBlocksBatches: FetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.getChainId(),
      specName: unsafeApi.getSpecName(),
      genesisHash: unsafeApi.getGenesisHash(),
    };
  }

  static async create(
    endpoint: string,
    fetchBlockBatches: FetchFunc,
    eventEmitter: EventEmitter2,
  ): Promise<SorobanApiConnection> {
    const api = new SorobanApi(endpoint, eventEmitter);

    await api.init();

    return new SorobanApiConnection(api, fetchBlockBatches);
  }

  safeApi(height: number): SafeSorobanProvider {
    return new SafeSorobanProvider(this.unsafeApi.api, height);
  }

  async apiConnect(): Promise<void> {
    await this.unsafeApi.connect();
  }

  async apiDisconnect(): Promise<void> {
    await this.unsafeApi.disconnect();
  }

  async fetchBlocks(heights: number[]): Promise<SorobanBlockWrapper[]> {
    const blocks = await this.fetchBlocksBatches(this.unsafeApi, heights);
    return blocks;
  }

  handleError = SorobanApiConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.includes(`Timeout`)) {
      formatted_error = SorobanApiConnection.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = SorobanApiConnection.handleDisconnectionError(e);
    } else if (
      e.message.includes(`Rate Limit Exceeded`) ||
      e.message.includes('Too Many Requests')
    ) {
      formatted_error = SorobanApiConnection.handleRateLimitError(e);
    } else if (e.message.includes(`limit must not exceed`)) {
      formatted_error = SorobanApiConnection.handleLargeResponseError(e);
    } else {
      formatted_error = new ApiConnectionError(
        e.name,
        e.message,
        ApiErrorType.Default,
      );
    }
    return formatted_error;
  }

  static handleLargeResponseError(e: Error): ApiConnectionError {
    const newMessage = `Oversized RPC node response. This issue is related to the network's RPC nodes configuration, not your application. You may report it to the network's maintainers or try a different RPC node.\n\n${e.message}`;

    return new ApiConnectionError(
      'RpcInternalError',
      newMessage,
      ApiErrorType.Default,
    );
  }

  static handleRateLimitError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'RateLimit',
      e.message,
      ApiErrorType.RateLimit,
    );
  }

  static handleTimeoutError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'TimeoutError',
      e.message,
      ApiErrorType.Timeout,
    );
  }

  static handleDisconnectionError(e: Error): ApiConnectionError {
    return new ApiConnectionError(
      'ConnectionError',
      e.message,
      ApiErrorType.Connection,
    );
  }
}
