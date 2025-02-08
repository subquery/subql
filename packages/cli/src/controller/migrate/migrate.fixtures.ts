// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {SubgraphProject} from './types';

export const TestSubgraph: SubgraphProject = {
  specVersion: '0.0.4',
  description: 'POAP',
  repository: 'https://github.com/poap-xyz/poap-mainnet-subgraph',
  schema: {
    file: './schema.graphql',
  },
  dataSources: [
    {
      kind: 'ethereum/contract',
      name: 'Poap',
      network: 'mainnet',
      source: {
        address: '0x22C1f6050E56d2876009903609a2cC3fEf83B415',
        abi: 'Poap',
        startBlock: 7844214,
      },

      mapping: {
        kind: 'ethereum/events',
        apiVersion: '0.0.6',
        language: 'wasm/assemblyscript',
        entities: ['EventToken', 'Transfer'],
        abis: [{name: 'Poap', file: './abis/Poap.json'}],
        eventHandlers: [
          {event: 'EventToken(uint256,uint256)', handler: 'handleEventToken'},
          {event: 'Transfer(indexed address,indexed address,indexed uint256)', handler: 'handleTransfer'},
        ],
        file: './src/mapping.ts',
      },
    },
  ],
};
