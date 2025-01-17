// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { LRUCache } from 'lru-cache';

const MAX_CACHE_SIZE = 200;
const CACHE_TTL = 60 * 1000;

export function createCachedProvider<
  P extends ProviderInterface = ProviderInterface,
>(provider: P): P {
  const cacheMap = new LRUCache<string, Promise<any>>({
    max: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  });

  const cachedMethodHandler = (
    fn: ProviderInterface['send'],
    args: Parameters<ProviderInterface['send']>,
  ) => {
    const [method, params] = args;
    // If there are no parameters then we don't cache as we want the latest results
    if (!params.length) {
      return fn(...args);
    }

    const cacheKey = `${method}-${params[0]}`;
    if (cacheMap.has(cacheKey)) {
      return cacheMap.get(cacheKey);
    }

    const resultPromise = fn(...args);
    cacheMap.set(cacheKey, resultPromise);
    return resultPromise;
  };

  const originalSend = provider.send.bind(provider);
  (provider as any).send = (...args: Parameters<ProviderInterface['send']>) => {
    const [method] = args;
    //caching state_getRuntimeVersion and chain_getHeader
    //because they are fetched twice per block
    if (['state_getRuntimeVersion', 'chain_getHeader'].includes(method)) {
      return cachedMethodHandler(originalSend, args);
    }

    return originalSend(...args);
  };

  return provider;
}
