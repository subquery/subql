// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'worker_threads';
import {Injectable} from '@nestjs/common';
import {Cache} from '@subql/types-core';
import {unwrapProxyArgs} from './utils';

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

@Injectable()
export class WorkerInMemoryCacheService {
  constructor(private host: HostCache) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  getCache(): Cache {
    return hostCacheToCache(this.host);
  }
}
