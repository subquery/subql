// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {LCDClient} from '@terra-money/terra.js';
import Pino from 'pino';
import {Store} from './interfaces';

declare global {
  const api: LCDClient;
  const logger: Pino.Logger;
  const store: Store;
}
