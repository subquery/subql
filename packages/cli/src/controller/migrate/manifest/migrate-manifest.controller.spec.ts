// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {SubgraphProject} from '../types';
import {extractNetworkFromManifest} from './migrate-manifest.controller';

describe('migrate controller', () => {
  let subgraph: SubgraphProject;

  beforeEach(() => {
    subgraph = {
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
  });

  it(`subgraphTemplateToSubqlTemplate`, () => {
    //TODO
  });

  it(`subgraphDsToSubqlDs`, () => {
    //TODO
  });

  it(`extractNetworkFromManifest, should extract network info, throw if network not same`, () => {
    const chainInfo = extractNetworkFromManifest(subgraph);
    expect(chainInfo).toStrictEqual({networkFamily: NETWORK_FAMILY.ethereum, chainId: '1'});

    const mockPloygonDs = {...subgraph.dataSources[0]};
    mockPloygonDs.network = 'polygon';
    subgraph.dataSources.push(mockPloygonDs);
    expect(() => extractNetworkFromManifest(subgraph)).toThrow(
      `All network values in subgraph Networks should be the same. Got mainnet,polygon`
    );
  });

  it(`extractNetworkFromManifest, should throw if can not determine network family from ds`, () => {
    delete subgraph.dataSources[0].kind;
    expect(() => extractNetworkFromManifest(subgraph)).toThrow(`Subgraph dataSource kind or network not been found`);
  });
});
