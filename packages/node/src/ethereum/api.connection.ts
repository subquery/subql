// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  NetworkMetadataPayload,
} from '@subql/node-core';
import { EthereumBlockWrapper } from '@subql/types-ethereum';
import { EthereumApi } from './api.ethereum';
import SafeEthProvider from './safe-api';

type FetchFunc = (
  api: EthereumApi,
  batch: number[],
) => Promise<EthereumBlockWrapper[]>;

export class EthereumApiConnection
  implements
    IApiConnectionSpecific<EthereumApi, SafeEthProvider, EthereumBlockWrapper>
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: EthereumApi,
    private fetchBlocksBatches: FetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.getChainId().toString(),
      specName: unsafeApi.getSpecName(),
      genesisHash: unsafeApi.getGenesisHash(),
    };
  }

  static async create(
    endpoint: string,
    fetchBlockBatches: FetchFunc,
    eventEmitter: EventEmitter2,
  ): Promise<EthereumApiConnection> {
    const api = new EthereumApi(endpoint, eventEmitter);

    await api.init();

    return new EthereumApiConnection(api, fetchBlockBatches);
  }

  safeApi(height: number): SafeEthProvider {
    throw new Error(`Not Implemented`);
  }

  async apiConnect(): Promise<void> {
    await this.unsafeApi.connect();
  }

  async apiDisconnect(): Promise<void> {
    await this.unsafeApi.disconnect();
  }

  async fetchBlocks(heights: number[]): Promise<EthereumBlockWrapper[]> {
    const blocks = await this.fetchBlocksBatches(this.unsafeApi, heights);
    return blocks;
  }

  handleError = EthereumApiConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = EthereumApiConnection.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = EthereumApiConnection.handleDisconnectionError(e);
    } else if (e.message.startsWith(`Rate Limited at endpoint`)) {
      formatted_error = EthereumApiConnection.handleRateLimitError(e);
    } else {
      formatted_error = new ApiConnectionError(
        e.name,
        e.message,
        ApiErrorType.Default,
      );
    }
    return formatted_error;
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
