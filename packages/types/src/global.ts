// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {Store} from './interfaces';

declare global {
  const api: ApiPromise;

  const store: Store;
}
