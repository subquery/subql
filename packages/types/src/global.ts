// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import Pino from 'pino';
import {Server} from 'soroban-client';
import {Store, DynamicDatasourceCreator} from './interfaces';

declare global {
  const api: Server;
  const logger: Pino.Logger;
  const store: Store;
  const chainId: string;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
