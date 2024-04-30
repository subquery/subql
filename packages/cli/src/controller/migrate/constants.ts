// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {convertEthereumDs, convertEthereumTemplate} from './manifest/ethereum';
import {NetworkUtils} from './types';

export const networkConverters: Partial<Record<NETWORK_FAMILY, NetworkUtils>> = {
  [NETWORK_FAMILY.ethereum]: {dsConverter: convertEthereumDs, templateConverter: convertEthereumTemplate},
};

export const graphToSubqlNetworkFamily: Record<string, NETWORK_FAMILY> = {
  'ethereum/contract': NETWORK_FAMILY.ethereum,
  // Add more mappings here as needed
};

export const graphNetworkNameChainId: Partial<Record<NETWORK_FAMILY, Record<string, string>>> = {
  [NETWORK_FAMILY.ethereum]: {
    mainnet: '1',
    sepolia: '11155111',
    optimism: '10',
    aurora: '1313161554',
    bsc: '56',
    gnosis: '100',
    fuse: '122',
    moonbeam: '1284',
    moonriver: '1285',
    mbase: '1287',
    clover: '1023',
    scroll: '534352',
    matic: '137',
    mumbai: '80001',
    avalanche: '43114',
    fuji: '43113',
    'arbitrum-sepolia': '421614',
    'fantom-testnet': '4002',
    'optimism-sepolia': '11155420',
    'blast-mainnet': '81457',
    'blast-testnet': '168587773',
    'arbitrum-one': '42161',
    'astar-zkevm-mainnet': '3776',
    'base-sepolia': '84532',
    'polygon-zkevm': '84532',
  },
};
