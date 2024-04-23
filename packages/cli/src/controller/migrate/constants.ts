// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {convertEthereumDs, convertEthereumTemplate} from './manifest/ethereum';
import {DsConvertFunction, TemplateConvertFunction, NetworkExampleProject} from './types';

// @ts-ignore
export const networkDsConverters: Record<NETWORK_FAMILY, DsConvertFunction> = {
  [NETWORK_FAMILY.ethereum]: convertEthereumDs,
  // [NETWORK_FAMILY.substrate]: convertSubstrateDs,
  // [NETWORK_FAMILY.cosmos]: convertCosmosDs,
  // [NETWORK_FAMILY.algorand]: convertAlgorandDs,
  // [NETWORK_FAMILY.flare]: convertFlareDs,
  // [NETWORK_FAMILY.near]: convertNearDs,
  // [NETWORK_FAMILY.stellar]: convertStellarDs,
  // [NETWORK_FAMILY.concordium]: convertConcordiumDs,
};

// @ts-ignore
export const networkTemplateConverters: Record<NETWORK_FAMILY, TemplateConvertFunction> = {
  [NETWORK_FAMILY.ethereum]: convertEthereumTemplate,
  // [NETWORK_FAMILY.substrate]: convertSubstrateDs,
  // [NETWORK_FAMILY.cosmos]: convertCosmosDs,
  // [NETWORK_FAMILY.algorand]: convertAlgorandDs,
  // [NETWORK_FAMILY.flare]: convertFlareDs,
  // [NETWORK_FAMILY.near]: convertNearDs,
  // [NETWORK_FAMILY.stellar]: convertStellarDs,
  // [NETWORK_FAMILY.concordium]: convertConcordiumDs,
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

// @ts-ignore
export const graphNetworkNameChainId: Record<NETWORK_FAMILY, Record<string, string>> = {
  [NETWORK_FAMILY.ethereum]: {mainnet: '1'},
  // [NETWORK_FAMILY.substrate]: {},
  // [NETWORK_FAMILY.cosmos]: {},
  // [NETWORK_FAMILY.algorand]: {},
  // [NETWORK_FAMILY.flare]: {},
  // [NETWORK_FAMILY.near]: {},
  // [NETWORK_FAMILY.stellar]: {},
  // [NETWORK_FAMILY.concordium]: {},
};
