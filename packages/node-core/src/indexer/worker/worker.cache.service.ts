// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Cache} from '@subql/types-core';
import {unwrapProxyArgs} from './worker.store.service';

export type HostCache = {
  cacheSet(key: string, value: any): Promise<void>;
  cacheGet(key: string): Promise<any>;
};

export const hostCacheKeys: (keyof HostCache)[] = ['cacheGet', 'cacheSet'];

export const hostCacheToCache = (host: HostCache): Cache => {
  return {
    get: unwrapProxyArgs(host.cacheGet),
    set: unwrapProxyArgs(host.cacheSet),
  };
};

export function cacheHostFunctions(cache: Cache): HostCache {
  return {
    cacheGet: cache.get.bind(cache),
    cacheSet: cache.set.bind(cache),
  };
}
