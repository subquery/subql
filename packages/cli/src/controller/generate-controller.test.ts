// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {loadFromJsonOrYaml} from '@subql/common';
import rimraf from 'rimraf';
import {parseContractPath} from 'typechain';
import {stringify} from 'yaml';
import {SelectedMethod, UserInput} from '../commands/codegen/generate';
import {generateHandlerName, generateHandlers, generateManifest} from './generate-controller';

const ROOT_MAPPING_DIR = 'src/mappings';
const PROJECT_PATH = path.join(__dirname, '../../test/schemaTest6');
const MANIFEST_PATH = './generate-project.yaml';

const mockConstructedFunctions: SelectedMethod[] = [
  {
    name: 'transferFrom',
    method: 'transferFrom(address,address,uint256)',
  },
];

const mockConstructedEvents: SelectedMethod[] = [
  {
    name: 'Approval',
    method: 'Approval(address,address,uint256)',
  },
];

const mockConstructedFunctionsDuplicates: SelectedMethod[] = [
  {
    name: 'transferFrom',
    method: 'transferFrom(address,address,uint256)',
  },
  {
    name: 'approve',
    method: 'approve(address,uint256)',
  },
];

const mockConstructedEventsDuplicates: SelectedMethod[] = [
  {
    name: 'Approval',
    method: 'Approval(address,address,uint256)',
  },
  {
    name: 'Transfer',
    method: 'Transfer(address,address,uint256)',
  },
];

const originalManifestData = {
  specVersion: '1.0.0',
  name: 'generate-test',
  version: '0.0.1',
  runner: {
    node: {
      name: '@subql/node-ethereum',
      version: '*',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId: '1',
    endpoint: ['https://eth.api.onfinality.io/public'],
    dictionary: 'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
  },
  dataSources: [
    {
      kind: 'ethereum/Runtime',
      startBlock: 4719568,
      options: {
        abi: 'erc721',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      assets: {
        erc721: {
          file: './erc721.json',
        },
      },
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: 'ethereum/TransactionHandler',
            filter: {
              function: 'approve(address spender, uint256 rawAmount)',
            },
          },
          {
            handler: 'handleLog',
            kind: 'ethereum/LogHandler',
            filter: {
              topics: ['Transfer(address indexed from, address indexed to, uint256 amount)'],
            },
          },
        ],
      },
    },
  ],
};

const originalManifestData2 = {
  specVersion: '1.0.0',
  name: 'generate-test',
  version: '0.0.1',
  runner: {
    node: {
      name: '@subql/node-ethereum',
      version: '*',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId: '1',
    endpoint: ['https://eth.api.onfinality.io/public'],
    dictionary: 'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
  },
  dataSources: [
    {
      kind: 'ethereum/Runtime',
      startBlock: 4719568,
      options: {
        abi: 'erc721',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      assets: {
        erc721: {
          file: './erc721.json',
        },
      },
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: 'ethereum/TransactionHandler',
            filter: {
              function: 'approve(address,uint256)',
            },
          },
          {
            handler: 'handleLog',
            kind: 'ethereum/LogHandler',
            filter: {
              topics: ['Transfer(address,address,uint256)'],
            },
          },
        ],
      },
    },
  ],
};

const abiName = parseContractPath('./erc721.json').name;

const mockUserInput: UserInput = {
  startBlock: 1,
  functions: mockConstructedFunctions,
  events: mockConstructedEvents,
  abiPath: './abis/erc721.json',
  address: 'aaa',
};

describe('CLI codegen:generate, Can write to file', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/schemaTest6/src'));
    await fs.promises.writeFile(path.join(PROJECT_PATH, MANIFEST_PATH), stringify(originalManifestData), {
      encoding: 'utf8',
      flag: 'w',
    });
    await fs.promises.writeFile(
      path.join(PROJECT_PATH, './generate-project-2.yaml'),
      stringify(originalManifestData2),
      {
        encoding: 'utf8',
        flag: 'w',
      }
    );
  });

  it('Can generate manifest', async () => {
    await generateManifest(PROJECT_PATH, MANIFEST_PATH, mockUserInput);
    const updatedManifestDs = (loadFromJsonOrYaml(path.join(PROJECT_PATH, MANIFEST_PATH)) as any).dataSources;

    expect(updatedManifestDs[1]).toStrictEqual({
      kind: 'ethereum/Runtime',
      startBlock: mockUserInput.startBlock,
      options: {
        abi: 'Erc721',
        address: mockUserInput.address,
      },
      assets: {
        Erc721: {
          file: mockUserInput.abiPath,
        },
      },
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            filter: {
              function: mockUserInput.functions[0].method,
            },
            handler: `${generateHandlerName(mockUserInput.functions[0].name, abiName, 'tx')}`,
            kind: 'ethereum/TransactionHandler',
          },
          {
            filter: {
              topics: [mockUserInput.events[0].method],
            },
            handler: `${generateHandlerName(mockUserInput.events[0].name, abiName, 'log')}`,
            kind: 'ethereum/LogHandler',
          },
        ],
      },
    });
  });
  it('Should not overwrite existing datasource, if handler filter already exist', async () => {
    mockUserInput.functions = mockConstructedFunctionsDuplicates;
    mockUserInput.events = mockConstructedEventsDuplicates;
    await generateManifest(PROJECT_PATH, './generate-project-2.yaml', mockUserInput);
    const updatedManifestDs = (loadFromJsonOrYaml(path.join(PROJECT_PATH, './generate-project-2.yaml')) as any)
      .dataSources;

    const handlers = updatedManifestDs.map((e: any) => {
      return e.mapping.handlers;
    });
    expect(handlers[1]).toStrictEqual([
      {
        handler: 'handleTransferFromErc721Tx',
        kind: 'ethereum/TransactionHandler',
        filter: {
          function: 'transferFrom(address,address,uint256)',
        },
      },
      {
        handler: 'handleApprovalErc721Log',
        kind: 'ethereum/LogHandler',
        filter: {
          topics: ['Approval(address,address,uint256)'],
        },
      },
    ]);
  });
  it('Can generate mapping handlers', async () => {
    // Prepare directory
    await fs.promises.mkdir(path.join(PROJECT_PATH, 'src/'));
    await fs.promises.mkdir(path.join(PROJECT_PATH, ROOT_MAPPING_DIR));
    await fs.promises.writeFile(path.join(PROJECT_PATH, 'src/index.ts'), 'export * from "./mappings/mappingHandlers"');

    // should not overwrite existing data in index.ts
    await generateHandlers([mockConstructedEvents, mockConstructedFunctions], PROJECT_PATH, abiName);
    const expectedFnHandler = `${generateHandlerName(mockUserInput.functions[0].name, abiName, 'tx')}`;
    const expectedEventHandler = `${generateHandlerName(mockUserInput.events[0].name, abiName, 'log')}`;

    const codegenResult = await fs.promises.readFile(
      path.join(PROJECT_PATH, ROOT_MAPPING_DIR, `${abiName}Handlers.ts`)
    );
    const importFile = await fs.promises.readFile(path.join(PROJECT_PATH, '/src', 'index.ts'));

    const expectImportFile =
      '' +
      `export * from "./mappings/mappingHandlers"
export * from "./mappings/Erc721Handlers"`;

    const expectedGeneratedCode =
      '' +
      `// SPDX-License-Identifier: Apache-2.0

// Auto-generated

import {TransferFromTransaction,ApprovalLog,} from "../types/abi-interfaces/Erc721";

import assert from "assert";

export async function ${expectedFnHandler} (tx: TransferFromTransaction ): Promise<void> {
// Place your code logic here
}

export async function ${expectedEventHandler} (log: ApprovalLog ): Promise<void> {
// Place your code logic here
}
`;
    expect(importFile.toString()).toBe(expectImportFile);
    expect(codegenResult.toString()).toBe(expectedGeneratedCode);
  });
});
