// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Horizon, rpc} from '@stellar/stellar-sdk';
import '@subql/types-core/dist/global';

declare global {
  // const api: rpc.Server;

  /*
   * The unsafeApi allows direct acces to making RPC calls.
   * WARNING: It is not scoped to the current block so it will query current chain state. This can lead to a project being non-deterministic.
   * To have access to the unsafeApi please use the `unsafe` flag in your project configuration.
   */
  const unsafeApi: Horizon.Server | undefined;
  const unsafeSorobanApi: rpc.Server | undefined;
}
