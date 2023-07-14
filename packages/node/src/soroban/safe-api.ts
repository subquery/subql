// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from '@subql/node-core';
import { Server } from 'soroban-client';

const logger = getLogger('safe.api.soroban');

export default class SafeSorobanProvider extends Server {
  constructor(private baseApi: Server, private blockHeight: number) {
    super(baseApi.serverURL);
  }
}
