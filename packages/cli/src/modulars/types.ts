// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import type {INetworkCommonModule} from '@subql/types-core';
import type {CosmosNetworkModule} from '@subql/types-cosmos';
import type {EthereumNetworkModule} from '@subql/types-ethereum';

export type ModuleCache = {
  [K in Exclude<NETWORK_FAMILY, NETWORK_FAMILY.cosmos | NETWORK_FAMILY.ethereum>]: INetworkCommonModule;
} & {
  [NETWORK_FAMILY.cosmos]: CosmosNetworkModule;
  [NETWORK_FAMILY.ethereum]: EthereumNetworkModule;
};
