// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {CosmWasmClient} from '@cosmjs/cosmwasm-stargate';
import {CosmWasmSafeClient} from './interfaces';

declare global {
  const apiUnsafe: CosmWasmClient; //requires --unsafe flag to be defined
  const api: CosmWasmSafeClient;
}
