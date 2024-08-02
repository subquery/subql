// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {EventFragment, FunctionFragment} from '@ethersproject/abi';
import {DEFAULT_TS_MANIFEST, loadFromJsonOrYaml, NETWORK_FAMILY} from '@subql/common';
import {getAbiInterface} from '@subql/common-ethereum';
import {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import {rimraf} from 'rimraf';
import {Document, stringify} from 'yaml';
import Generate, {SelectedMethod, UserInput} from '../commands/codegen/generate';
import {loadDependency} from '../modulars';
import {
  constructMethod,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlerName,
  generateHandlers,
  generateManifestTs,
  generateManifestYaml,
  getManifestData,
  prepareAbiDirectory,
  prepareInputFragments,
  yamlExtractor,
} from './generate-controller';

const ROOT_MAPPING_DIR = 'src/mappings';
const PROJECT_PATH = path.join(__dirname, '../../test/schemaTest');
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

const ethModule = loadDependency(NETWORK_FAMILY.ethereum);
const abiName = ethModule.parseContractPath('./erc721.json').name;

const mockUserInput: UserInput = {
  startBlock: 1,
  functions: mockConstructedFunctions,
  events: mockConstructedEvents,
  abiPath: './abis/erc721.json',
  address: 'aaa',
};

jest.setTimeout(30000);

describe('CLI codegen:generate, Can write to file', () => {
  afterEach(async () => {
    await Promise.all([
      rimraf(path.join(__dirname, '../../test/schemaTest/src')),
      rimraf(path.join(__dirname, '../../test/schemaTest/abis/abis.json')),
      rimraf(path.join(__dirname, '../../test/ts-manifest/mock-project.ts')),
      fs.promises.writeFile(path.join(PROJECT_PATH, MANIFEST_PATH), stringify(originalManifestData), {
        encoding: 'utf8',
        flag: 'w',
      }),
    ]);

    const doc = new Document(originalManifestData2);
    const ds = (doc.get('dataSources') as any).items[0];
    ds.commentBefore = 'datasource comment';
    ds.get('mapping').get('handlers').comment = 'handler comment';
    await fs.promises.writeFile(path.join(PROJECT_PATH, './generate-project-2.yaml'), stringify(doc), {
      encoding: 'utf8',
      flag: 'w',
    });
  });
  it('generateManifest from ts-manifest', async () => {
    const pPath = path.join(__dirname, '../../test/ts-manifest');
    const filePath = path.join(pPath, 'mock-project.ts');
    const tsManifest = await fs.promises.readFile(path.join(pPath, DEFAULT_TS_MANIFEST), 'utf8');
    const mockInput: UserInput = {
      startBlock: 1,
      functions: mockConstructedFunctions,
      events: mockConstructedEvents,
      abiPath: './abis/erc721.json',
      address: 'aaa',
    };
    await generateManifestTs(path.join(pPath, './mock-project.ts'), mockInput, tsManifest);
    const newManifest = await fs.promises.readFile(filePath, 'utf8');
    expect(newManifest).toBe(
      '// @ts-nocheck\n' +
        "import {EthereumProject, EthereumDatasourceKind, EthereumHandlerKind} from '@subql/types-ethereum';\n" +
        '\n' +
        '// Can expand the Datasource processor types via the generic param\n' +
        'const project: EthereumProject = {\n' +
        "  specVersion: '1.0.0',\n" +
        "  version: '0.0.1',\n" +
        "  name: 'ethereum-subql-starter',\n" +
        "  description: 'This project can be use as a starting point for developing your new Ethereum SubQuery project',\n" +
        '  runner: {\n' +
        '    node: {\n' +
        "      name: '@subql/node-ethereum',\n" +
        "      version: '>=3.0.0',\n" +
        '    },\n' +
        '    query: {\n' +
        "      name: '@subql/query',\n" +
        "      version: '*',\n" +
        '    },\n' +
        '  },\n' +
        '  schema: {\n' +
        "    file: './schema.graphql',\n" +
        '  },\n' +
        '  network: {\n' +
        '    /**\n' +
        '     * chainId is the EVM Chain ID, for Ethereum this is 1\n' +
        '     * https://chainlist.org/chain/1\n' +
        '     */\n' +
        "    chainId: '1',\n" +
        '    /**\n' +
        '     * This endpoint must be a public non-pruned archive node\n' +
        '     * Public nodes may be rate limited, which can affect indexing speed\n' +
        '     * When developing your project we suggest getting a private API key\n' +
        '     * You can get them from OnFinality for free https://app.onfinality.io\n' +
        '     * https://documentation.onfinality.io/support/the-enhanced-api-service\n' +
        '     */\n' +
        "    endpoint: ['https://eth.api.onfinality.io/public'],\n" +
        "    dictionary: 'https://gx.api.subquery.network/sq/subquery/eth-dictionary',\n" +
        '  },\n' +
        '  dataSources: [{\n' +
        '    kind: EthereumDatasourceKind.Runtime,\n' +
        '    startBlock: 1,\n' +
        '    options: {\n' +
        "      abi: 'Erc721',\n" +
        "      address: 'aaa',\n" +
        '    },\n' +
        "    assets: new Map([['Erc721', {file: './abis/erc721.json'}]]),\n" +
        '    mapping: {\n' +
        "      file: './dist/index.js',\n" +
        '      handlers: [\n' +
        '  {\n' +
        '    handler: "handleTransferFromErc721Tx",\n' +
        '    kind: EthereumHandlerKind.Call,\n' +
        '    filter: {\n' +
        '      function: "transferFrom(address,address,uint256)"\n' +
        '    }\n' +
        '  },\n' +
        '  {\n' +
        '    handler: "handleApprovalErc721Log",\n' +
        '    kind: EthereumHandlerKind.Event,\n' +
        '    filter: {\n' +
        '      topics: [\n' +
        '        "Approval(address,address,uint256)"\n' +
        '      ]\n' +
        '    }\n' +
        '  }\n' +
        ']\n' +
        '    }\n' +
        '  },\n' +
        '    {\n' +
        '      kind: EthereumDatasourceKind.Runtime,\n' +
        '      startBlock: 4719568,\n' +
        '\n' +
        '      options: {\n' +
        '        // Must be a key of assets\n' +
        "        abi: 'erc20',\n" +
        '        // # this is the contract address for wrapped ether https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2\n' +
        "        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',\n" +
        '      },\n' +
        "      assets: new Map([['erc20', {file: './abis/erc20.abi.json'}]]),\n" +
        '      mapping: {\n' +
        "        file: './dist/index.js',\n" +
        '        handlers: [\n' +
        '          {\n' +
        '            kind: EthereumHandlerKind.Call,\n' +
        "            handler: 'handleTransaction',\n" +
        '            filter: {\n' +
        '              /**\n' +
        '               * The function can either be the function fragment or signature\n' +
        "               * function: '0x095ea7b3'\n" +
        "               * function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'\n" +
        '               */\n' +
        "              function: 'approve(address spender, uint256 rawAmount)',\n" +
        '            },\n' +
        '          },\n' +
        '          {\n' +
        '            kind: EthereumHandlerKind.Event,\n' +
        "            handler: 'handleLog',\n" +
        '            filter: {\n' +
        '              /**\n' +
        '               * Follows standard log filters https://docs.ethers.io/v5/concepts/events/\n' +
        '               * address: "0x60781C2586D68229fde47564546784ab3fACA982"\n' +
        '               */\n' +
        "              topics: ['Transfer(address indexed from, address indexed to, uint256 amount)'],\n" +
        '            },\n' +
        '          },\n' +
        '        ],\n' +
        '      },\n' +
        '    },\n' +
        '  ],\n' +
        "  repository: 'https://github.com/subquery/ethereum-subql-starter',\n" +
        '};\n' +
        '\n' +
        'export default project;\n'
    );
  });
  it('Can generate manifest', async () => {
    const existingManifestData = await getManifestData(path.join(PROJECT_PATH, MANIFEST_PATH));
    await generateManifestYaml(path.join(PROJECT_PATH, MANIFEST_PATH), mockUserInput, existingManifestData);
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
  it('if handler filter already exist with matching address, should not add', async () => {
    const existingManifestData = await getManifestData(path.join(PROJECT_PATH, './generate-project-2.yaml'));
    const abiInterface = getAbiInterface(PROJECT_PATH, './erc721.json');
    const existingDs = (existingManifestData.get('dataSources') as any).toJSON() as EthereumDs[];

    const rawEventFragments = abiInterface.events;
    const rawFunctionFragments = filterObjectsByStateMutability(abiInterface.functions);

    const selectedEvents = await prepareInputFragments('event', 'approval, transfer', rawEventFragments, abiName);
    const selectedFunctions = await prepareInputFragments(
      'function',
      'approve, transferFrom',
      rawFunctionFragments,
      abiName
    );

    const [eventFrags, functionFrags] = filterExistingMethods(
      selectedEvents,
      selectedFunctions,
      existingDs,
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      yamlExtractor
    );

    mockUserInput.events = constructMethod<EventFragment>(eventFrags);
    mockUserInput.functions = constructMethod<FunctionFragment>(functionFrags);

    await generateManifestYaml(
      path.join(PROJECT_PATH, './generate-project-2.yaml'),
      mockUserInput,
      existingManifestData
    );

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
  it('should preserve any comments in existing datasources', async () => {
    await fs.promises.mkdir(path.join(PROJECT_PATH, 'src/'));
    await fs.promises.mkdir(path.join(PROJECT_PATH, ROOT_MAPPING_DIR));
    await fs.promises.writeFile(path.join(PROJECT_PATH, 'src/index.ts'), 'export * from "./mappings/mappingHandlers"');

    await Generate.run([
      '-f',
      path.join(PROJECT_PATH, './generate-project-2.yaml'),
      '--events',
      'approval, transfer',
      '--functions',
      'transferFrom, approve',
      '--abiPath',
      './erc721.json',
      '--startBlock',
      '1',
    ]);

    const manifest = await getManifestData(path.join(PROJECT_PATH, './generate-project-2.yaml'));
    const ds = manifest.get('dataSources') as any;
    expect(ds.commentBefore).toBe('datasource comment');
    expect(ds.items[0].get('mapping').get('handlers').comment).toBe('handler comment');
  });

  it('should throw, if handler file exists', async () => {
    await fs.promises.mkdir(path.join(PROJECT_PATH, 'src/'));
    await fs.promises.mkdir(path.join(PROJECT_PATH, ROOT_MAPPING_DIR));
    await fs.promises.writeFile(path.join(PROJECT_PATH, 'src/mappings/Erc721Handlers.ts'), 'zzzzzz');

    await expect(
      Generate.run([
        '-f',
        path.join(PROJECT_PATH, './generate-project-2.yaml'),
        '--events',
        'approval, transfer',
        '--functions',
        'transferFrom, approve',
        '--abiPath',
        './erc721.json',
        '--startBlock',
        '1',
      ])
    ).rejects.toThrow('file: Erc721Handlers.ts already exists');
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


export async function ${expectedFnHandler}(tx: TransferFromTransaction ): Promise<void> {
// Place your code logic here
}

export async function ${expectedEventHandler}(log: ApprovalLog ): Promise<void> {
// Place your code logic here
}
`;
    expect(importFile.toString()).toBe(expectImportFile);
    expect(codegenResult.toString()).toBe(expectedGeneratedCode);
  });
  it('Throws if invalid abiPath is given', async () => {
    await expect(prepareAbiDirectory('asd/asd.json', PROJECT_PATH)).rejects.toThrow(
      'Unable to find abi at: asd/asd.json'
    );
  });
  it('Should be able to parse relative path on abiPath', async () => {
    const abiPath_relative = './packages/cli/test/abiTest1/abis/abis.json';
    await prepareAbiDirectory(abiPath_relative, PROJECT_PATH);

    expect(fs.existsSync(path.join(PROJECT_PATH, 'abis/abis.json'))).toBeTruthy();
  });
  it('Should be able to parse absolute path on abiPath', async () => {
    const abiPath_absolute = path.join(__dirname, '../../test/abiTest1/abis/abis.json');
    await prepareAbiDirectory(abiPath_absolute, PROJECT_PATH);

    expect(fs.existsSync(path.join(PROJECT_PATH, 'abis/abis.json'))).toBeTruthy();
  });
});
