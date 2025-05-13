// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import type {INetworkCommonModule} from '@subql/types-core';
import type {CosmosNetworkModule} from '@subql/types-cosmos';
import type {EthereumNetworkModule} from '@subql/types-ethereum';
import type {SolanaNetworkModule} from '@subql/types-solana';

export type ModuleCache = {
  [K in Exclude<
    NETWORK_FAMILY,
    NETWORK_FAMILY.cosmos | NETWORK_FAMILY.ethereum | NETWORK_FAMILY.solana
  >]: INetworkCommonModule;
} & {
  [NETWORK_FAMILY.cosmos]: CosmosNetworkModule;
  [NETWORK_FAMILY.ethereum]: EthereumNetworkModule;
  [NETWORK_FAMILY.solana]: SolanaNetworkModule;
};
