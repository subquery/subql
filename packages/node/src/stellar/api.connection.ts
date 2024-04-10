// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  NetworkMetadataPayload,
  TimeoutError,
  RateLimitError,
  DisconnectionError,
  LargeResponseError,
} from '@subql/node-core';
import { StellarBlockWrapper } from '@subql/types-stellar';
import { StellarApi } from './api.stellar';
import SafeStellarProvider from './safe-api';
import { SorobanServer } from './soroban.server';

type FetchFunc = (
  api: StellarApi,
  batch: number[],
) => Promise<StellarBlockWrapper[]>;

export class StellarApiConnection
  implements
    IApiConnectionSpecific<
      StellarApi,
      SafeStellarProvider,
      StellarBlockWrapper[]
    >
{
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: StellarApi,
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
    soroban?: SorobanServer,
  ): Promise<StellarApiConnection> {
    const api = new StellarApi(endpoint, eventEmitter, soroban);

    await api.init();

    return new StellarApiConnection(api, fetchBlockBatches);
  }

  safeApi(height: number): SafeStellarProvider {
    //safe api not implemented
    return new SafeStellarProvider(null, height);
  }

  async apiConnect(): Promise<void> {
    await this.unsafeApi.connect();
  }

  async apiDisconnect(): Promise<void> {
    await this.unsafeApi.disconnect();
  }

  async fetchBlocks(heights: number[]): Promise<StellarBlockWrapper[]> {
    const blocks = await this.fetchBlocksBatches(this.unsafeApi, heights);
    return blocks;
  }

  handleError = StellarApiConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.includes(`Timeout`)) {
      formatted_error = new TimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = new DisconnectionError(e);
    } else if (
      e.message.includes(`Rate Limit Exceeded`) ||
      e.message.includes('Too Many Requests')
    ) {
      formatted_error = new RateLimitError(e);
    } else if (e.message.includes(`limit must not exceed`)) {
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
