// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {StargateClient} from '@cosmjs/stargate';
import Pino from 'pino';
import {Store, DynamicDatasourceCreator} from './interfaces';

declare global {
  const apiUnsafe: CosmWasmClient; //requires --unsafe flag to be defined
  const api: CosmWasmClient;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}
