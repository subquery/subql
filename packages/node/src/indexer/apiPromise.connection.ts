// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { RegisteredTypes } from '@polkadot/types/types';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  NetworkMetadataPayload,
} from '@subql/node-core';
import * as SubstrateUtil from '../utils/substrate';
import { ApiAt, BlockContent } from './types';
import { createCachedProvider } from './x-provider/cachedProvider';
import { HttpProvider } from './x-provider/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;

type FetchFunc = typeof SubstrateUtil.fetchBlocksBatches;

export class ApiPromiseConnection
  implements IApiConnectionSpecific<ApiPromise, ApiAt, BlockContent>
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: ApiPromise,
    private apiOptions: ApiOptions,
    private endpoint: string,
    private fetchBlocksBatches: FetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.runtimeChain.toString(),
      specName: unsafeApi.runtimeVersion.specName.toString(),
      genesisHash: unsafeApi.genesisHash.toString(),
    };
  }

  static async create(
    endpoint: string,
    fetchBlocksBatches: FetchFunc,
    args: { chainTypes: RegisteredTypes },
  ): Promise<ApiPromiseConnection> {
    let provider: ProviderInterface;
    let throwOnConnect = false;

    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    if (endpoint.startsWith('ws')) {
      provider = createCachedProvider(
        new WsProvider(endpoint, RETRY_DELAY, headers),
      );
    } else if (endpoint.startsWith('http')) {
      provider = createCachedProvider(new HttpProvider(endpoint, headers));
      throwOnConnect = true;
    }

    const apiOption = {
      provider,
      throwOnConnect,
      noInitWarn: true,
      ...args.chainTypes,
    };
    const api = await ApiPromise.create(apiOption);
    return new ApiPromiseConnection(
      api,
      apiOption,
      endpoint,
      fetchBlocksBatches,
    );
  }

  safeApi(height: number): ApiAt {
    throw new Error(`Not Implemented`);
  }

  async fetchBlocks(
    heights: number[],
    overallSpecVer?: number,
  ): Promise<BlockContent[]> {
    const blocks = await this.fetchBlocksBatches(
      this.unsafeApi,
      heights,
      overallSpecVer,
    );
    return blocks;
  }

  async apiConnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.unsafeApi.isConnected) {
        resolve();
      }

      this.unsafeApi.on('connected', () => {
        resolve();
      });

      if (!this.unsafeApi.isConnected) {
        this.unsafeApi.connect();
      }
    });
  }

  async apiDisconnect(): Promise<void> {
    await this.unsafeApi.disconnect();
  }

  handleError = ApiPromiseConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = ApiPromiseConnection.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = ApiPromiseConnection.handleDisconnectionError(e);
    } else if (e.message.startsWith(`-32029: Too Many Requests`)) {
      formatted_error = ApiPromiseConnection.handleRateLimitError(e);
    } else if (e.message.includes(`Exceeded max limit of`)) {
      formatted_error = ApiPromiseConnection.handleLargeResponseError(e);
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
    const formatted_error = new ApiConnectionError(
      'RateLimit',
      e.message,
      ApiErrorType.RateLimit,
    );
    return formatted_error;
  }

  static handleTimeoutError(e: Error): ApiConnectionError {
    const formatted_error = new ApiConnectionError(
      'TimeoutError',
      e.message,
      ApiErrorType.Timeout,
    );
    return formatted_error;
  }

  static handleDisconnectionError(e: Error): ApiConnectionError {
    const formatted_error = new ApiConnectionError(
      'ConnectionError',
      e.message,
      ApiErrorType.Connection,
    );
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
}
