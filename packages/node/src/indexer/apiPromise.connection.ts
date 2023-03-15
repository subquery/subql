// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { RegisteredTypes } from '@polkadot/types/types';
import { ApiConnection } from '@subql/node-core';
import { HttpProvider } from './x-provider/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;

export class ApiPromiseConnection implements ApiConnection {
  constructor(private _api: ApiPromise) {}

  static async create(
    endpoint: string,
    args: { chainTypes: RegisteredTypes },
  ): Promise<ApiPromiseConnection> {
    let provider: WsProvider | HttpProvider;
    let throwOnConnect = false;

    const headers = {
      'User-Agent': `SubQuery-Node ${packageVersion}`,
    };

    if (endpoint.startsWith('ws')) {
      provider = new WsProvider(endpoint, RETRY_DELAY, headers);
    } else if (endpoint.startsWith('http')) {
      provider = new HttpProvider(endpoint, headers);
      throwOnConnect = true;
    }

    const apiOption = {
      provider,
      throwOnConnect,
      noInitWarn: true,
      ...args.chainTypes,
    };
    const api = await ApiPromise.create(apiOption);
    return new ApiPromiseConnection(api);
  }

  get api(): ApiPromise {
    return this._api;
  }

  async apiConnect(): Promise<void> {
    await this._api.connect();
  }
  async apiDisconnect(): Promise<void> {
    await this._api.disconnect();
  }
}
