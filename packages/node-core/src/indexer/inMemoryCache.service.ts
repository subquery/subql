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
export class InMemoryCacheService<T extends Record<string, any> = Record<string, any>> {
  private cache: T = {} as T;

  getCache(): Cache<T> {
    return {
      //eslint-disable-next-line @typescript-eslint/require-await
      get: async (key: keyof T): Promise<T[keyof T] | undefined> => {
        return this.cache[key];
      },

      //eslint-disable-next-line @typescript-eslint/require-await
      set: async (key: keyof T, value: T[keyof T]): Promise<void> => {
        this.cache[key] = value;
      },
    };
  }
}
