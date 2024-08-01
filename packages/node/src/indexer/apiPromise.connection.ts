// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { ApiOptions } from '@polkadot/api/types';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { RegisteredTypes } from '@polkadot/types/types';
import {
  ApiConnectionError,
  ApiErrorType,
  DisconnectionError,
  LargeResponseError,
  NetworkMetadataPayload,
  RateLimitError,
  TimeoutError,
  IApiConnectionSpecific,
  IBlock,
} from '@subql/node-core';
import { IEndpointConfig } from '@subql/types-core';
import * as SubstrateUtil from '../utils/substrate';
import { ApiAt, BlockContent, LightBlockContent } from './types';
import { createCachedProvider } from './x-provider/cachedProvider';
import { HttpProvider } from './x-provider/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;

export type FetchFunc =
  | typeof SubstrateUtil.fetchBlocksBatches
  | typeof SubstrateUtil.fetchBlocksBatchesLight;

// We use a function to get the fetch function because it can change depending on the skipTransactions feature
export type GetFetchFunc = () => FetchFunc;

export class ApiPromiseConnection
  implements
    IApiConnectionSpecific<
      ApiPromise,
      ApiAt,
      IBlock<BlockContent>[] | IBlock<LightBlockContent>[]
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  private constructor(
    public unsafeApi: ApiPromise,
    private fetchBlocksBatches: GetFetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.runtimeChain.toString(),
      specName: unsafeApi.runtimeVersion.specName.toString(),
      genesisHash: unsafeApi.genesisHash.toString(),
    };
  }

  static async create(
    endpoint: string,
    fetchBlocksBatches: GetFetchFunc,
    args: { chainTypes?: RegisteredTypes },
    config: IEndpointConfig,
  ): Promise<ApiPromiseConnection> {
    let provider: ProviderInterface;
    let throwOnConnect = false;

    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
      ...config.headers,
    };

    if (endpoint.startsWith('ws')) {
      provider = createCachedProvider(
        new WsProvider(endpoint, RETRY_DELAY, headers),
      );
    } else if (endpoint.startsWith('http')) {
      provider = createCachedProvider(new HttpProvider(endpoint, headers));
      throwOnConnect = true;
    } else {
      throw new Error(`Invalid endpoint: ${endpoint}`);
    }

    const apiOption = {
      provider,
      throwOnConnect,
      noInitWarn: true,
      ...args.chainTypes,
    };
    const api = await ApiPromise.create(apiOption);
    return new ApiPromiseConnection(api, fetchBlocksBatches);
  }

  safeApi(height: number): ApiAt {
    throw new Error(`Not Implemented`);
  }

  async fetchBlocks(
    heights: number[],
    overallSpecVer?: number,
  ): Promise<IBlock<BlockContent>[] | IBlock<LightBlockContent>[]> {
    const blocks = await this.fetchBlocksBatches()(
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

  async updateChainTypes(chainTypes: RegisteredTypes): Promise<void> {
    // Typeof Decorate<'promise' | 'rxjs'>, but we need to access this private method
    const currentApiOptions = (this.unsafeApi as any)._options as ApiOptions;
    const apiOption = {
      ...currentApiOptions,
      ...chainTypes,
    };
    this.unsafeApi = await ApiPromise.create(apiOption);
  }

  handleError = ApiPromiseConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = new TimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = new DisconnectionError(e);
    } else if (e.message.startsWith(`-32029: Too Many Requests`)) {
      formatted_error = new RateLimitError(e);
    } else if (e.message.includes(`Exceeded max limit of`)) {
      formatted_error = new LargeResponseError(e);
    } else {
      formatted_error = new ApiConnectionError(
        e.name,
        e.message,
        ApiErrorType.Default,
      );
    }
    return formatted_error;
  }
}
