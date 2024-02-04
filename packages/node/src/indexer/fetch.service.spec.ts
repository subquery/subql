// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { GraphQLSchema } from 'graphql';
import {
  EthereumProjectDsTemplate,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { buildDictionaryQueryEntries, FetchService } from './fetch.service';

// const HTTP_ENDPOINT = 'https://eth.api.onfinality.io/public';
const HTTP_ENDPOINT = 'https://eth.llamarpc.com';
const mockTempDs: EthereumProjectDsTemplate[] = [
  {
    name: 'ERC721',
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(),
    mapping: {
      entryScript: '',
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
      entryScript: '',
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

function testSubqueryProject(
  endpoint: string,
  ds: any,
  mockTempDs,
): SubqueryProject {
  return {
    network: {
      endpoint,
      chainId: '1',
    },
    dataSources: ds as any,
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: mockTempDs as any,
  } as any;
}

describe('Dictionary queries', () => {
  describe('Log filters', () => {
    it('Build filter for !null', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          abi: 'erc20',
          address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        },
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleLog',
              kind: EthereumHandlerKind.Event,
              filter: {
                topics: [
                  'Transfer(address, address, uint256)',
                  undefined,
                  undefined,
                  '!null',
                ],
              },
            },
          ],
        },
      };
      const result = buildDictionaryQueryEntries([ds]);

      expect(result).toEqual([
        {
          entity: 'evmLogs',
          conditions: [
            {
              field: 'address',
              matcher: 'equalTo',
              value: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
            },
            {
              field: 'topics0',
              value:
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              matcher: 'equalTo',
            },
            {
              field: 'topics3',
              value: false,
              matcher: 'isNull',
            },
          ],
        },
      ]);
    });
  });

  describe('Transaction filters', () => {
    it('Build a filter for contract creation transactions', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransaction',
              kind: EthereumHandlerKind.Call,
              filter: {
                to: null,
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds]);

      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [{ field: 'to', matcher: 'isNull', value: true }],
        },
      ]);
    });

    it('Build a filter with include ds option and contract address', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          abi: 'erc20',
          address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        },
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransfer',
              kind: EthereumHandlerKind.Call,
              filter: {
                function: 'approve(address spender, uint256 rawAmount)',
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds]);
      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [
            {
              field: 'to',
              matcher: 'equalTo',
              value: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
            },
            { field: 'func', matcher: 'equalTo', value: '0x095ea7b3' },
          ],
        },
      ]);
    });

    it('If ds option and filter both provide contract address, it should use ds options one', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          abi: 'erc20',
          address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        },
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransfer',
              kind: EthereumHandlerKind.Call,
              filter: {
                to: '0xabcde',
                function: 'approve(address spender, uint256 rawAmount)',
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds]);
      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [
            {
              field: 'to',
              matcher: 'equalTo',
              value: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
            },
            { field: 'func', matcher: 'equalTo', value: '0x095ea7b3' },
          ],
        },
      ]);
    });

    it('If ds option provide contract address, it should use ds options "address"', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          abi: 'erc20',
          address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
        },
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransfer',
              kind: EthereumHandlerKind.Call,
              filter: {
                function: 'approve(address spender, uint256 rawAmount)',
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds]);
      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [
            {
              field: 'to',
              matcher: 'equalTo',
              value: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
            },
            { field: 'func', matcher: 'equalTo', value: '0x095ea7b3' },
          ],
        },
      ]);
    });

    it('If filter  provide contract address, it should use filter "to"', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        options: {
          abi: 'erc20',
        },
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransfer',
              kind: EthereumHandlerKind.Call,
              filter: {
                to: '0xabcde',
                function: 'approve(address spender, uint256 rawAmount)',
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds]);
      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [
            {
              field: 'to',
              matcher: 'equalTo',
              value: '0xabcde',
            },
            { field: 'func', matcher: 'equalTo', value: '0x095ea7b3' },
          ],
        },
      ]);
    });
  });
  describe('Correct dictionary query with dynamic ds', () => {
    it('Build correct erc1155 transfer single query', () => {
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
      const result = buildDictionaryQueryEntries([ds]);
      expect(result).toEqual([
        {
          entity: 'evmLogs',
          conditions: [
            {
              field: 'topics0',
              value:
                '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
              matcher: 'equalTo',
            },
          ],
        },
      ]);
    });

    it('Builds a groupded query for multiple dynamic ds', () => {
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

      const project = testSubqueryProject(
        HTTP_ENDPOINT,
        dataSources,
        mockTempDs,
      );

      const fetchService = new FetchService(
        null,
        null,
        null,
        project,
        null,
        null,
        null,
        null,
        null,
        null,
      );

      const queryEntry = (fetchService as any).buildDictionaryQueryEntries(
        dataSources,
      );

      expect(queryEntry).toEqual([
        {
          entity: 'evmLogs',
          conditions: [
            {
              field: 'topics0',
              value:
                '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
              matcher: 'equalTo',
            },
          ],
        },
        {
          entity: 'evmLogs',
          conditions: [
            {
              field: 'address',
              // This is what we're looking to happen with multiple instances of template
              value: ['address1', 'address2'],
              matcher: 'in',
            },
            {
              field: 'topics0',
              value:
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              matcher: 'equalTo',
            },
          ],
        },
        {
          entity: 'evmLogs',
          conditions: [
            // This condition should not be grouped because there is a single instance of the tamplate
            {
              field: 'address',
              value: 'address3',
              matcher: 'equalTo',
            },
            {
              field: 'topics0',
              value:
                '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
              matcher: 'equalTo',
            },
          ],
        },
      ]);
    });
  });
});
