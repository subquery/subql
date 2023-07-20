// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {get} from 'lodash';

export class Config {
  constructor(private readonly store: Record<never, never>) {}

  get<T>(key: string, defaultValue?: T): T {
    return (process.env[key.toUpperCase()] as unknown as T) ?? get(this.store, key, defaultValue);
  }
}
