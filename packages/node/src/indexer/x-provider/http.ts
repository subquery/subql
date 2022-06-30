// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// overwrite the official Polkadot HttpProvider: https://github.com/polkadot-js/api/blob/master/packages/rpc-provider/src/http/index.ts
// Use context and fetch to provide http1 keepAlive and maxSocket feature

import { RpcCoder } from '@polkadot/rpc-provider/coder';
import defaults from '@polkadot/rpc-provider/defaults';
import { LRUCache } from '@polkadot/rpc-provider/lru';
import type {
  JsonRpcResponse,
  ProviderInterface,
  ProviderInterfaceCallback,
  ProviderInterfaceEmitCb,
  ProviderInterfaceEmitted,
  ProviderStats,
} from '@polkadot/rpc-provider/types';
import { context } from 'fetch-h2';
import { getLogger } from '../../utils/logger';

const ctx = context({
  http1: {
    keepAlive: true,
    maxSockets: 10,
  },
});

const ERROR_SUBSCRIBE =
  'HTTP Provider does not have subscriptions, use WebSockets instead';

const l = getLogger('http-provider');

/**
 * # @polkadot/rpc-provider
 *
 * @name HttpProvider
 *
 * @description The HTTP Provider allows sending requests using HTTP to a HTTP RPC server TCP port. It does not support subscriptions so you won't be able to listen to events such as new blocks or balance changes. It is usually preferable using the [[WsProvider]].
 *
 * @example
 * <BR>
 *
 * ```javascript
 * import Api from '@polkadot/api/promise';
 * import { HttpProvider } from '@polkadot/rpc-provider';
 *
 * const provider = new HttpProvider('http://127.0.0.1:9933');
 * const api = new Api(provider);
 * ```
 *
 * @see [[WsProvider]]
 */
export class HttpProvider implements ProviderInterface {
  readonly #callCache = new LRUCache();

  readonly #coder: RpcCoder;

  readonly #endpoint: string;

  readonly #headers: Record<string, string>;

  readonly #stats: ProviderStats;

  /**
   * @param {string} endpoint The endpoint url starting with http://
   */
  constructor(
    endpoint: string = defaults.HTTP_URL,
    headers: Record<string, string> = {},
  ) {
    if (!/^(https|http):\/\//.test(endpoint)) {
      throw new Error(
        `Endpoint should start with 'http://' or 'https://', received '${endpoint}'`,
      );
    }

    this.#coder = new RpcCoder();
    this.#endpoint = endpoint;
    this.#headers = headers;
    this.#stats = {
      active: { requests: 0, subscriptions: 0 },
      total: {
        bytesRecv: 0,
        bytesSent: 0,
        cached: 0,
        errors: 0,
        requests: 0,
        subscriptions: 0,
        timeout: 0,
      },
    };
  }

  /**
   * @summary `true` when this provider supports subscriptions
   */
  get hasSubscriptions(): boolean {
    return false;
  }

  /**
   * @description Returns a clone of the object
   */
  clone(): HttpProvider {
    return new HttpProvider(this.#endpoint, this.#headers);
  }

  /**
   * @description Manually connect from the connection
   */
  async connect(): Promise<void> {
    // noop
  }

  /**
   * @description Manually disconnect from the connection
   */
  async disconnect(): Promise<void> {
    // noop
  }

  /**
   * @description Returns the connection stats
   */
  get stats(): ProviderStats {
    return this.#stats;
  }

  /**
   * @summary Whether the node is connected or not.
   * @return {boolean} true if connected
   */
  get isConnected(): boolean {
    return true;
  }

  /**
   * @summary Events are not supported with the HttpProvider, see [[WsProvider]].
   * @description HTTP Provider does not have 'on' emitters. WebSockets should be used instead.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  on(type: ProviderInterfaceEmitted, sub: ProviderInterfaceEmitCb): () => void {
    l.error(
      "HTTP Provider does not have 'on' emitters, use WebSockets instead",
    );

    return (): void => {
      // noop
    };
  }

  /**
   * @summary Send HTTP POST Request with Body to configured HTTP Endpoint.
   */
  async send<T>(
    method: string,
    params: unknown[],
    isCacheable?: boolean,
  ): Promise<T> {
    this.#stats.total.requests++;

    const [, body] = this.#coder.encodeJson(method, params);
    let resultPromise: Promise<T> | null = isCacheable
      ? (this.#callCache.get(body) as Promise<T>)
      : null;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!resultPromise) {
      resultPromise = this._send(body);

      if (isCacheable) {
        this.#callCache.set(body, resultPromise);
      }
    } else {
      this.#stats.total.cached++;
    }

    return resultPromise;
  }

  async _send<T>(body: string): Promise<T> {
    this.#stats.active.requests++;
    this.#stats.total.bytesSent += body.length;

    try {
      const response = await ctx.fetch(this.#endpoint, {
        body,
        headers: {
          Accept: 'application/json',
          // Recommend dropped in HTTP2
          // 'Content-Length': `${body.length}`,
          'Content-Type': 'application/json',
          ...this.#headers,
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`[${response.status}]: ${response.statusText}`);
      }

      const result = await response.text();

      this.#stats.total.bytesRecv += result.length;

      const decoded = this.#coder.decodeResponse(
        JSON.parse(result) as JsonRpcResponse,
      ) as T;

      this.#stats.active.requests--;

      return decoded;
    } catch (e) {
      this.#stats.active.requests--;
      this.#stats.total.errors++;

      throw e;
    }
  }

  /**
   * @summary Subscriptions are not supported with the HttpProvider, see [[WsProvider]].
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/require-await
  async subscribe(
    types: string,
    method: string,
    params: unknown[],
    cb: ProviderInterfaceCallback,
  ): Promise<number> {
    l.error(ERROR_SUBSCRIBE);

    throw new Error(ERROR_SUBSCRIBE);
  }

  /**
   * @summary Subscriptions are not supported with the HttpProvider, see [[WsProvider]].
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/require-await
  async unsubscribe(
    type: string,
    method: string,
    id: number,
  ): Promise<boolean> {
    l.error(ERROR_SUBSCRIBE);

    throw new Error(ERROR_SUBSCRIBE);
  }
}
