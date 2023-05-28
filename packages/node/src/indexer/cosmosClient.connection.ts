// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Registry } from '@cosmjs/proto-signing';
import { HttpEndpoint } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { ApiConnection } from '@subql/node-core';
import { getLogger } from '@subql/node-core/dist';
import { CosmosClient, CosmosSafeClient } from './api.service';
import { HttpClient, WebsocketClient } from './rpc-clients';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;

const logger = getLogger('cosmos-client-connection');

export class CosmosClientConnection implements ApiConnection {
  private tmClient: Tendermint37Client;
  private registry: Registry;

  constructor(private _api: CosmosClient) {}

  static async create(
    endpoint: string,
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

    const connection = new CosmosClientConnection(api);
    connection.setTmClient(tendermint);
    connection.setRegistry(registry);

    logger.info(`connected to ${endpoint}`);

    return connection;
  }

  get api(): CosmosClient {
    return this._api;
  }

  getSafeApi(height: number): CosmosSafeClient {
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
    this._api = new CosmosClient(this.tmClient, this.registry);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async apiDisconnect(): Promise<void> {
    this._api.disconnect();
  }

  static handleError(e: Error): Error {
    let formatted_error: Error;
    if (e.message.startsWith(`No response received from RPC endpoint in`)) {
      formatted_error = this.handleTimeoutError(e);
    } else if (e.message.startsWith(`disconnected from `)) {
      formatted_error = this.handleDisconnectionError(e);
    } else {
      formatted_error = e;
    }
    return formatted_error;
  }

  static handleTimeoutError(e: Error): Error {
    const formatted_error = new Error();
    formatted_error.name = 'TimeoutError';
    formatted_error.message = e.message;
    return formatted_error;
  }

  static handleDisconnectionError(e: Error): Error {
    const formatted_error = new Error();
    formatted_error.name = 'ConnectionError';
    formatted_error.message = e.message;
    return formatted_error;
  }
}
