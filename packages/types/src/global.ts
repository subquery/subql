// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import type {Registry} from '@cosmjs/proto-signing';
import type Pino from 'pino';
import {Store, DynamicDatasourceCreator, CosmWasmSafeClient} from './interfaces';

declare global {
  const apiUnsafe: CosmWasmClient; //requires --unsafe flag to be defined
  const api: CosmWasmSafeClient;
  const logger: Pino.Logger;
  const store: Store;
  const chainId: string;
  const createDynamicDatasource: DynamicDatasourceCreator;
  const registry: Registry;
}
