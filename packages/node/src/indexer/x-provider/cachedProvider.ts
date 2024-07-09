// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { LRUCache } from 'lru-cache';

const MAX_CACHE_SIZE = 200;
const CACHE_TTL = 60 * 1000;

/* eslint-disable prefer-rest-params */
export function createCachedProvider(
  provider: ProviderInterface,
): ProviderInterface {
  const cacheMap = new LRUCache<string, Promise<any>>({
    max: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  });

  const cachedMethodHandler = (
    method: string,
    params: unknown[],
    target: any,
    args: any[],
  ) => {
    // If there are no parameters then we don't cache as we want the latest results
    if (!params.length) {
      return Reflect.apply(target, provider, args);
    }

    const cacheKey = `${method}-${params[0]}`;
    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey);
    }

    const resultPromise: Promise<any> = Reflect.apply(target, provider, args);
    cacheMap.set(cacheKey, resultPromise);
    return resultPromise;
  };

  return new Proxy(provider, {
    get: function (target, prop, receiver) {
      if (prop === 'send') {
        return function (
          method: string,
          params: unknown[],
          isCacheable: boolean,
          subscription: boolean,
        ) {
          //caching state_getRuntimeVersion and chain_getHeader
          //because they are fetched twice per block
          if (['state_getRuntimeVersion', 'chain_getHeader'].includes(method)) {
            return cachedMethodHandler(
              method,
              params,
              target.send.bind(target),
              arguments as unknown as any[],
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
