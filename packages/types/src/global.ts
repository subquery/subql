// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import Pino from 'pino';
import {Store, DynamicDatasourceCreator, ApiAt} from './interfaces';

declare global {
  const api: ApiAt;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
