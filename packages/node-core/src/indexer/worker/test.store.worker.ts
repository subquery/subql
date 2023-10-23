// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Store} from '@subql/types-core';
import {WorkerHost} from './worker.builder';
import {hostStoreKeys, hostStoreToStore} from './worker.store.service';

let store: Store | null = null;

async function callStoreFunction(name: string, args: any[]) {
  if (store === null) {
    throw new Error('Store is null');
  }
  const res = await (store as any)[name as any](...args);
}

const host = WorkerHost.create(
  hostStoreKeys,
  {
    callStoreFunction,
  },
  null as any
);

store = hostStoreToStore(host as any);
