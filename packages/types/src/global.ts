// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
