// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {convertEthereumDs, convertEthereumTemplate} from './manifest/ethereum';
import {NetworkExampleProject, NetworkUtils} from './types';

export const networkConverters: Partial<Record<NETWORK_FAMILY, NetworkUtils>> = {
  [NETWORK_FAMILY.ethereum]: {dsConverter: convertEthereumDs, templateConverter: convertEthereumTemplate},
};

export const graphToSubqlNetworkFamily: Record<string, NETWORK_FAMILY> = {
  'ethereum/contract': NETWORK_FAMILY.ethereum,
  // Add more mappings here as needed
};

// TODO, alternative approach
export const subqlNetworkTemplateNetwork: Record<NETWORK_FAMILY, NetworkExampleProject> = {
  Algorand: {},
  Concordium: {},
  Cosmos: {},
  Flare: {},
  Near: {},
  Stellar: {},
  Substrate: {},
  Ethereum: {
    '1': {
      name: 'eth-starter',
      path: 'Ethereum/ethereum-starter',
      description: '',
      remote: 'https://github.com/subquery/ethereum-subql-starter',
    },
  },
};

export const graphNetworkNameChainId: Partial<Record<NETWORK_FAMILY, Record<string, string>>> = {
  [NETWORK_FAMILY.ethereum]: {mainnet: '1'},
};
