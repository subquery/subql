// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { EthereumProjectDsTemplate } from '../../configure/SubqueryProject';
import { groupedDataSources } from './utils';

describe('Dictionary utils', () => {
  it('can filter eth ds with multiple dynamic ds/templates', () => {
    const mockTempDs: EthereumProjectDsTemplate[] = [
      {
        name: 'ERC721',
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleERC721',
              kind: EthereumHandlerKind.Event,
              filter: {
                topics: ['Transfer(address, address, uint256)'],
              },
            },
          ],
        },
      },
      {
        name: 'ERC1155',
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleERC1155',
              kind: EthereumHandlerKind.Event,
              filter: {
                topics: [
                  'TransferSingle(address, address, address, uint256, uint256)',
                ],
              },
            },
          ],
        },
      },
    ];

    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleDyanmicDs',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: [
                'TransferSingle(address, address, address, uint256, uint256)',
              ],
            },
          },
        ],
      },
    };

    const duplicateDataSources = [
      { ...mockTempDs[0], options: { address: 'address1' } },
      { ...mockTempDs[0], options: { address: 'address2' } },
      { ...mockTempDs[1], options: { address: 'address3' } },
    ];

    const dataSources = [ds, ...duplicateDataSources];
    // Runtime + ERC721 + ERC721 + ERC1155
    expect(dataSources.length).toBe(4);

    const grouped = groupedDataSources(dataSources);

    expect(grouped).toEqual([
      [
        {
          handler: 'handleDyanmicDs',
          kind: 'ethereum/LogHandler',
          filter: {
            topics: [
              'TransferSingle(address, address, address, uint256, uint256)',
            ],
          },
        },
        [undefined, 'address3'],
      ],
      [
        {
          handler: 'handleERC721',
          kind: 'ethereum/LogHandler',
          filter: {
            topics: ['Transfer(address, address, uint256)'],
          },
        },
        ['address1', 'address2'],
      ],
    ]);
  });
});
