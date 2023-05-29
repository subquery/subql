// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise, WsProvider } from '@polkadot/api';
import { RegisteredTypes } from '@polkadot/types/types';
import { ApiConnection } from '@subql/node-core';
import LRUCache from 'lru-cache';
import { HttpProvider } from './x-provider/http';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const RETRY_DELAY = 2_500;
const MAX_CACHE_SIZE = 200;
const CACHE_TTL = 60 * 1000;

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
      provider = ApiPromiseConnection.createCachedProvider(
        new WsProvider(endpoint, RETRY_DELAY, headers),
      );
    } else if (endpoint.startsWith('http')) {
      provider = ApiPromiseConnection.createCachedProvider(
        new HttpProvider(endpoint, headers),
      );
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

  /* eslint-disable prefer-rest-params */
  static createCachedProvider(provider: WsProvider | HttpProvider) {
    const cacheMap = new LRUCache({ max: MAX_CACHE_SIZE, ttl: CACHE_TTL });

    const cachedMethodHandler = (method, params, target, args) => {
      const cacheKey = `${method}-${params[0]}`;
      if (cacheMap.has(cacheKey)) {
        return Promise.resolve(cacheMap.get(cacheKey));
      }

      return (Reflect.apply(target, provider, args) as Promise<any>).then(
        (result) => {
          cacheMap.set(cacheKey, result);
          return result;
        },
      );
    };

    return new Proxy(provider, {
      get: function (target, prop, receiver) {
        if (prop === 'send') {
          return function (method, params, isCacheable, subscription) {
            if (
              ['state_getRuntimeVersion', 'chain_getHeader'].includes(method)
            ) {
              return cachedMethodHandler(
                method,
                params,
                target.send.bind(target),
                arguments,
              );
            }

            // For other methods, just forward the call to the original method.
            return Reflect.apply(target.send.bind(target), provider, arguments);
          };
        }

        // For other properties, just return the original value.
        return Reflect.get(target, prop, receiver);
      },
    });
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
