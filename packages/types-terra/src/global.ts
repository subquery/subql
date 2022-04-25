// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {LCDClient} from '@terra-money/terra.js';
import Pino from 'pino';
import {Store, DynamicDatasourceCreator} from './interfaces';

declare global {
  const apiUnsafe: LCDClient | undefined; //requires --unsafe flag to be defined
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
