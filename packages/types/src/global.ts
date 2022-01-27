// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {ApiDecoration} from '@polkadot/api/types';
import Pino from 'pino';
import {Store} from './interfaces';

type ApiAt = ApiDecoration<'promise'> & {rpc: ApiPromise['rpc']};

declare global {
  const api: ApiAt;
  const logger: Pino.Logger;
  const store: Store;
}
