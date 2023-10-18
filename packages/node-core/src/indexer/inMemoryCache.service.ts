// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {Cache} from '@subql/types-core';

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
