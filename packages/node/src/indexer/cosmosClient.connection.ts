// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Registry } from '@cosmjs/proto-signing';
import { HttpEndpoint } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import {
  ApiConnectionError,
  ApiErrorType,
  IApiConnectionSpecific,
  NetworkMetadataPayload,
} from '@subql/node-core';
import { getLogger } from '@subql/node-core/dist';
import { CosmosClient, CosmosSafeClient } from './api.service';
import { HttpClient, WebsocketClient } from './rpc-clients';
import { BlockContent } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;

const logger = getLogger('cosmos-client-connection');

type FetchFunc = (
  api: CosmosClient,
  batch: number[],
) => Promise<BlockContent[]>;

export class CosmosClientConnection
  implements
    IApiConnectionSpecific<CosmosClient, CosmosSafeClient, BlockContent>
{
  private tmClient: Tendermint37Client;
  private registry: Registry;
  readonly networkMeta: NetworkMetadataPayload;

  constructor(
    public unsafeApi: CosmosClient,
    private fetchBlocksBatches: FetchFunc,
    chainId: string,
  ) {
    this.networkMeta = {
      chain: chainId,
      specName: undefined,
      genesisHash: undefined,
    };
  }

  static async create(
    endpoint: string,
    fetchBlocksBatches: FetchFunc,
    registry: Registry,
  ): Promise<CosmosClientConnection> {
    const httpEndpoint: HttpEndpoint = {
      url: endpoint,
      headers: {
        'User-Agent': `SubQuery-Node ${packageVersion}`,
      },
    };

    const rpcClient =
      endpoint.includes('ws://') || endpoint.includes('wss://')
        ? new WebsocketClient(endpoint, (err) => {
            logger.error(err, `Websocket connection failed`);
            process.exit(1);
          })
        : new HttpClient(httpEndpoint);

    const tendermint = await Tendermint37Client.create(rpcClient);

    const api = new CosmosClient(tendermint, registry);

    const connection = new CosmosClientConnection(
      api,
      fetchBlocksBatches,
      await api.getChainId(),
    );
    connection.setTmClient(tendermint);
    connection.setRegistry(registry);

    logger.info(`connected to ${endpoint}`);

    return connection;
  }

  safeApi(height: number): CosmosSafeClient {
    return new CosmosSafeClient(this.tmClient, height);
  }

  private setTmClient(tmClient: Tendermint37Client): void {
    this.tmClient = tmClient;
  }

  private setRegistry(registry: Registry): void {
    this.registry = registry;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async apiConnect(): Promise<void> {
    this.unsafeApi = new CosmosClient(this.tmClient, this.registry);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async apiDisconnect(): Promise<void> {
    this.unsafeApi.disconnect();
  }

  async fetchBlocks(heights: number[]): Promise<BlockContent[]> {
    const blocks = await this.fetchBlocksBatches(this.unsafeApi, heights);
    return blocks;
  }

  handleError = CosmosClientConnection.handleError;

  static handleError(e: Error): ApiConnectionError {
    let formatted_error: ApiConnectionError;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = CosmosClientConnection.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = CosmosClientConnection.handleDisconnectionError(e);
    } else if (e.message.startsWith(`Request failed with status code 429`)) {
      formatted_error = CosmosClientConnection.handleRateLimitError(e);
    } else if (e.message.includes(`Exceeded max limit of`)) {
      formatted_error = CosmosClientConnection.handleLargeResponseError(e);
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

  static handleLargeResponseError(e: Error): ApiConnectionError {
    const newMessage = `Oversized RPC node response. This issue is related to the network's RPC nodes configuration, not your application. You may report it to the network's maintainers or try a different RPC node.\n\n${e.message}`;

    return new ApiConnectionError(
      'RpcInternalError',
      newMessage,
      ApiErrorType.Default,
    );
  }
}
