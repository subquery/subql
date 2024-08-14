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
  ethereum: NETWORK_FAMILY.ethereum,
  // Add more mappings here as needed
};

export const graphNetworkNameChainId: Partial<Record<NETWORK_FAMILY, Record<string, string>>> = {
  [NETWORK_FAMILY.ethereum]: {
    mainnet: '1',
    sepolia: '11155111',
    optimism: '10',
    aurora: '1313161554',
    bsc: '56',
    chapel: '97',
    gnosis: '100',
    fuse: '122',
    moonbeam: '1284',
    moonriver: '1285',
    mbase: '1287',
    base: '8453',
    boba: '288',
    celo: '42220',
    'celo-alfajores': '44787',
    fantom: '250',
    'fantom-testnet': '4002',
    clover: '1023',
    scroll: '534352',
    matic: '137',
    mumbai: '80001',
    holesky: '128',
    'aurora-testnet': '1313161555',
    harmony: '1666600000',
    'linea-sepolia': '11155111',
    'gnosis-chiado': '10200',
    'mode-sepolia': '919',
    mode: '34443',
    'polygon-zkevm': '1101',
    linea: '59144',
    'scroll-sepolia': '534351',
    'blast-mainnet': '238',
    'blast-testnet': '23888',
    'sei-testnet': '713715',
    sei: '1329',
    avalanche: '43114',
    fuji: '43113',
    'arbitrum-sepolia': '421614',
    'optimism-sepolia': '11155420',
    'arbitrum-one': '42161',
    'astar-zkevm-mainnet': '3776',
    'base-sepolia': '84532',
  },
};
