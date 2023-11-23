// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiConnectionError,
  ApiErrorType,
  DisconnectionError,
  LargeResponseError,
  NetworkMetadataPayload,
  RateLimitError,
  TimeoutError,
  IApiConnectionSpecific,
} from '@subql/node-core';
import { EthereumBlock, LightEthereumBlock } from '@subql/types-ethereum';
import { EthereumApi } from './api.ethereum';
import SafeEthProvider from './safe-api';

export type FetchFunc =
  | ((api: EthereumApi, batch: number[]) => Promise<EthereumBlock[]>)
  | ((api: EthereumApi, batch: number[]) => Promise<LightEthereumBlock[]>);

// We use a function to get the fetch function because it can change depending on the skipBlocks feature
export type GetFetchFunc = () => FetchFunc;

export class EthereumApiConnection
  implements
    IApiConnectionSpecific<
      EthereumApi,
      SafeEthProvider,
      EthereumBlock[] | LightEthereumBlock[]
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: EthereumApi,
    private fetchBlocksBatches: GetFetchFunc,
  ) {
    this.networkMeta = {
      chain: unsafeApi.getChainId().toString(),
      specName: unsafeApi.getSpecName(),
      genesisHash: unsafeApi.getGenesisHash(),
    };
  }

  static async create(
    endpoint: string,
    blockConfirmations: number,
    fetchBlocksBatches: GetFetchFunc,
    eventEmitter: EventEmitter2,
    unfinalizedBlocks: boolean,
  ): Promise<EthereumApiConnection> {
    const api = new EthereumApi(
      endpoint,
      blockConfirmations,
      eventEmitter,
      unfinalizedBlocks,
    );

    await api.init();

    return new EthereumApiConnection(api, fetchBlocksBatches);
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

  async fetchBlocks(
    heights: number[],
  ): Promise<EthereumBlock[] | LightEthereumBlock[]> {
    const blocks = await this.fetchBlocksBatches()(this.unsafeApi, heights);
    return blocks;
  }

  handleError = EthereumApiConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = new TimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = new DisconnectionError(e);
    } else if (e.message.startsWith(`Rate Limited at endpoint`)) {
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
