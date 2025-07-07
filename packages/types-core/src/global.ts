// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type Pino from 'pino';
import {Cache, DynamicDatasourceCreator} from './interfaces';
import {Store} from './store';

// base global
declare global {
  const logger: Pino.Logger;
  const store: Store;
  const cache: Cache;
  const chainId: string;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
