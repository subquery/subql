// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiConnection } from '@subql/node-core';
import { EthereumApi } from './api.ethereum';

export class EthereumApiConnection implements ApiConnection {
  private constructor(private _api: EthereumApi) {}

  static async create(
    endpoint: string,
    eventEmitter: EventEmitter2,
  ): Promise<EthereumApiConnection> {
    const api = new EthereumApi(endpoint, eventEmitter);

    await api.init();

    return new EthereumApiConnection(api);
  }

  get api(): EthereumApi {
    return this._api;
  }

  async apiConnect(): Promise<void> {
    await this._api.connect();
  }
  async apiDisconnect(): Promise<void> {
    await this._api.disconnect();
  }
}
