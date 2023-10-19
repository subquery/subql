// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {Cache} from '@subql/types-core';

/**
 * The `InMemoryCacheService` class provides an in-memory caching solution.
 * It's designed to temporarily store data that doesn't need to be persisted in a database.
 * The service is injectable and designed to be used within the sandbox
 */
@Injectable()
export class InMemoryCacheService {
  private cache: Record<string, any> = {};

  getCache(): Cache {
    return {
      //eslint-disable-next-line @typescript-eslint/require-await
      get: async <D = string>(key: string): Promise<D | undefined> => {
        if (this.cache[key]) {
          return this.cache[key] as D;
        }
      },
      //eslint-disable-next-line @typescript-eslint/require-await
      set: async <D = string>(key: string, value: D): Promise<void> => {
        this.cache[key] = value;
      },
    };
  }
}
