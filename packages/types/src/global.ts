// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ApiPromise} from '@polkadot/api';
import {ApiDecoration} from '@polkadot/api/types';
import Pino from 'pino';
import {Store, DynamicDatasourceCreator} from './interfaces';

type ApiAt = ApiDecoration<'promise'> & {rpc: ApiPromise['rpc']};

declare global {
  const api: ApiAt;
  const unsafeApi: ApiPromise;
  const logger: Pino.Logger;
  const store: Store;
  const chainId: string;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
