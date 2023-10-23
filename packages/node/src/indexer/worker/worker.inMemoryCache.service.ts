// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Injectable } from '@nestjs/common';
import { HostCache, hostCacheToCache } from '@subql/node-core';
import { Cache } from '@subql/types-core';

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
