// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {Registry} from '@cosmjs/proto-signing';
import {CosmWasmSafeClient} from './interfaces';
import '@subql/types-core/dist/global';

declare global {
  const apiUnsafe: CosmWasmClient; //requires --unsafe flag to be defined
  const api: CosmWasmSafeClient;
  const registry: Registry;
}
