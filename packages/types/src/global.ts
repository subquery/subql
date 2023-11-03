// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ApiPromise} from '@polkadot/api';
import {ApiDecoration} from '@polkadot/api/types';

import '@subql/types-core/dist/global';

type ApiAt = ApiDecoration<'promise'> & {rpc: ApiPromise['rpc']};

declare global {
  const api: ApiAt;
  const unsafeApi: ApiPromise | undefined;
}
