// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NodeConfig } from '@subql/node-core';
import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { GraphQLSchema } from 'graphql';
import {
  SubqlProjectDsTemplate,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { buildDictionaryQueryEntries, FetchService } from './fetch.service';

const HTTP_ENDPOINT = 'https://eth.api.onfinality.io/public';
const mockTempDs: SubqlProjectDsTemplate[] = [
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
  };
}

describe('Dictionary queries', () => {
  describe('Log filters', () => {
    it('Build filter for !null', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
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
      const result = buildDictionaryQueryEntries([ds], 1);

      expect(result).toEqual([
        {
          entity: 'evmLogs',
          conditions: [
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

      const result = buildDictionaryQueryEntries([ds], 1);

      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [{ field: 'to', matcher: 'isNull', value: true }],
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
      const result = buildDictionaryQueryEntries([ds], 1);
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

    it('Build dictionary query for multiple dictionary queries', async () => {
      const nodeConfig = new NodeConfig({
        subquery: '',
        subqueryName: '',
      });
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

      const project = testSubqueryProject(HTTP_ENDPOINT, ds, mockTempDs);

      const dsProcessService = new DsProcessorService(project, nodeConfig);

      const dynamicDsService = new DynamicDsService(dsProcessService, project);
      const fetchService = new FetchService(
        null,
        null,
        project,
        null,
        null,
        dsProcessService,
        dynamicDsService,
        null,
        null,
        null,
      );
      const mockMetadataDS = [
        {
          templateName: 'ERC721',
          args: { address: '0xc9aeee58550328a2462f758c8d47022ec53589c2' },
          startBlock: 1,
        },
        {
          templateName: 'ERC1155',
          args: { address: '0x63228048121877a9e0f52020834a135074e8207c' },
          startBlock: 1,
        },
      ];

      jest
        .spyOn(dynamicDsService as any, 'getDynamicDatasourceParams')
        .mockResolvedValue(mockMetadataDS);

      (dynamicDsService as any).project.templates = mockTempDs;
      const loadedDSResult = await (
        dynamicDsService as any
      ).getDynamicDatasources(); // mocks params to mockMetadataDS

      (fetchService as any).project.dataSources = [ds];
      (fetchService as any).templateDynamicDatasouces = loadedDSResult;

      const dictionaryQueries = (
        fetchService as any
      ).buildDictionaryQueryEntries(1);
      expect(dictionaryQueries).toEqual([
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
              value: ['0xc9aeee58550328a2462f758c8d47022ec53589c2'],
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
            {
              field: 'address',
              value: ['0x63228048121877a9e0f52020834a135074e8207c'],
              matcher: 'in',
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
