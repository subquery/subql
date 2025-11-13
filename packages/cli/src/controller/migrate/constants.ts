// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {convertEthereumDs, convertEthereumTemplate} from './manifest/ethereum';
import {NetworkUtils} from './types';

export const networkConverters: Partial<Record<NETWORK_FAMILY, NetworkUtils>> = {
  [NETWORK_FAMILY.ethereum]: {dsConverter: convertEthereumDs, templateConverter: convertEthereumTemplate},
};

export const graphToSubqlNetworkFamily: Record<string, NETWORK_FAMILY> = {
  'ethereum/contract': NETWORK_FAMILY.ethereum,
  ethereum: NETWORK_FAMILY.ethereum,
  // Add more mappings here as needed
};
