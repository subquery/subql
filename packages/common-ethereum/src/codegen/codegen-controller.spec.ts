// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {EthereumDatasourceKind, EthereumHandlerKind, SubqlRuntimeDatasource} from '@subql/types-ethereum';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {NOT_NULL_FILTER} from '../project/utils';
import {
  AbiInterface,
  generateAbis,
  getAbiNames,
  joinInputAbiName,
  prepareAbiJob,
  prepareSortedAssets,
} from './codegen-controller';

describe('Codegen spec', () => {
  const PROJECT_PATH = path.join(__dirname, '../../test/abiTest');

  it('ensure correct output when input does not contain []', () => {
    const mockAbiInterface = {
      type: 'function',
      name: 'initialize',
      inputs: [
        {
          name: '__name',
          type: 'STRING',
        },
      ],
    } as AbiInterface;
    expect(joinInputAbiName(mockAbiInterface)).toMatch('initialize_string_');
  });
  it('should replace [] in input abi name', () => {
    const mockAbiInterface = {
      type: 'function',
      name: 'initialize',
      inputs: [
        {
          name: '__name',
          type: 'string',
        },
        {
          name: '__symbol',
          type: 'string',
        },
        {
          name: '__baseURI',
          type: 'string',
        },
        {
          name: 'admins',
          type: 'address[]',
        },
      ],
    } as AbiInterface;
    expect(joinInputAbiName(mockAbiInterface)).toMatch('initialize_string_string_string_address_arr_');
  });

  it('json is object without abi field or empty abi json, should throw', () => {
    const artifactAssetObj: Record<string, string> = {
      artifact: './abis/bad-erc20.json',
    };

    expect(() => prepareAbiJob(artifactAssetObj, PROJECT_PATH, (fp) => require(fp))).toThrow(
      'Provided ABI is not a valid ABI or Artifact'
    );
  });
  it('Empty abi json, should throw', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest2');

    const artifactAssetObj = {
      artifact: './artifact.json',
    };

    expect(() => prepareAbiJob(artifactAssetObj, projectPath, () => [])).toThrow(
      'Invalid abi is provided at asset: artifact'
    );
  });
  it('Should sort assets', () => {
    const ds = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Call,
          },
        ],
      },
    };
    expect(prepareSortedAssets([ds], PROJECT_PATH)).toStrictEqual({Erc20: './abis/erc20.json'});
  });

  it('Should sort assets with object', () => {
    const ds = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Call,
          },
        ],
      },
    };
    expect(prepareSortedAssets([ds], PROJECT_PATH)).toStrictEqual({Erc20: './abis/erc20.json'});
  });

  it('read artifact abis', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest');
    const abisAssetObj = {
      Erc20: './abis/erc20.json',
    };

    const artifactAssetObj = {
      artifactErc20: './abis/Erc20.sol/Erc20.json',
    };

    const abisRendered = prepareAbiJob(abisAssetObj, projectPath, (fp) => require(fp));
    const artifactRendered = prepareAbiJob(artifactAssetObj, projectPath, (fp) => require(fp));

    // exclude name field
    artifactRendered.map((e) => {
      e.name = expect.any(String);
    });
    expect(abisRendered).toStrictEqual(expect.objectContaining(artifactRendered));
  });

  it('render correct codegen from ejs', async () => {
    const mockJob = {
      name: 'Erc20',
      events: ['Approval'],
      functions: [
        {
          typename: 'approve',
          functionName: 'approve',
        },
      ],
    };

    const data = await ejs.renderFile(path.resolve(__dirname, '../../templates/abi-interface.ts.ejs'), {
      props: {abi: mockJob},
      helper: {upperFirst},
    });
    await fs.promises.writeFile(path.join(PROJECT_PATH, 'test.ts'), data);
    const expectedCodegen =
      '' +
      '// SPDX-License-Identifier: Apache-2.0\n' +
      '\n' +
      '// Auto-generated , DO NOT EDIT\n' +
      'import {EthereumLog, EthereumTransaction, LightEthereumLog} from "@subql/types-ethereum";\n' +
      '\n' +
      "import {ApprovalEvent, Erc20} from '../contracts/Erc20'\n" +
      '\n' +
      '\n' +
      'export type ApprovalLog = EthereumLog<ApprovalEvent["args"]>\n' +
      '\n' +
      '\n' +
      'export type LightApprovalLog = LightEthereumLog<ApprovalEvent["args"]>\n' +
      '\n' +
      '\n' +
      "export type Transaction = EthereumTransaction<Parameters<Erc20['functions']['approve']>>";
    const output = await fs.promises.readFile(path.join(PROJECT_PATH, 'test.ts'));
    expect(output.toString()).toMatch(expectedCodegen);
    await promisify(rimraf)(path.join(PROJECT_PATH, 'test.ts'));
  });

  it('Correctness on getAbiNames', () => {
    expect(getAbiNames(['Erc721__factory.ts', 'Erc1155__factory.ts', 'index.ts'])).toStrictEqual(['Erc721', 'Erc1155']);
  });

  it('Generate correct restructured index.ts', async () => {
    const mockAbiNames = ['Erc721', 'Erc1155', 'Erc1967'];
    const contractsData = await ejs.renderFile(path.resolve(__dirname, '../../templates/contracts-index.ts.ejs'), {
      props: {abiNames: mockAbiNames},
    });
    const factoriesData = await ejs.renderFile(path.resolve(__dirname, '../../templates/factories-index.ts.ejs'), {
      props: {abiNames: mockAbiNames},
    });
    await Promise.all([
      fs.promises.writeFile(path.join(PROJECT_PATH, 'contracts-index.ts'), contractsData),
      fs.promises.writeFile(path.join(PROJECT_PATH, 'factories-index.ts'), factoriesData),
    ]);
    const contractOutput = await fs.promises.readFile(path.join(PROJECT_PATH, 'contracts-index.ts'));
    const factoriesOutput = await fs.promises.readFile(path.join(PROJECT_PATH, 'factories-index.ts'));

    expect(contractOutput.toString()).toBe(
      '' +
        '/* Autogenerated file. Do not edit manually. */\n' +
        '/* tslint:disable */\n' +
        '/* eslint-disable */\n' +
        'export * as factories from "./factories";\n' +
        '\n' +
        'export { Erc721 } from "./Erc721";\n' +
        '\n' +
        'export { Erc1155 } from "./Erc1155";\n' +
        '\n' +
        'export { Erc1967 } from "./Erc1967";\n' +
        '\n' +
        '\n' +
        'export { Erc721__factory } from "./factories/Erc721__factory";\n' +
        '\n' +
        'export { Erc1155__factory } from "./factories/Erc1155__factory";\n' +
        '\n' +
        'export { Erc1967__factory } from "./factories/Erc1967__factory";\n'
    );
    expect(factoriesOutput.toString()).toBe(
      '' +
        '/* Autogenerated file. Do not edit manually. */\n' +
        '/* tslint:disable */\n' +
        '/* eslint-disable */\n' +
        '\n' +
        '\n' +
        'export { Erc721__factory } from "./Erc721__factory";\n' +
        '\n' +
        'export { Erc1155__factory } from "./Erc1155__factory";\n' +
        '\n' +
        'export { Erc1967__factory } from "./Erc1967__factory";\n'
    );

    await Promise.all([
      promisify(rimraf)(path.join(PROJECT_PATH, 'contracts-index.ts')),
      promisify(rimraf)(path.join(PROJECT_PATH, 'factories-index.ts')),
    ]);
  });

  it('Generates valid function names with complex types', () => {
    const artifactAssetObj: Record<string, string> = {
      artifact: './abis/contract_with_overloads.json',
    };

    const [props] = prepareAbiJob(artifactAssetObj, PROJECT_PATH, (fp: string) => require(fp));

    expect(props.functions[4].functionName).toEqual('deregisterOperatorWithCoordinator(bytes,(uint256,uint256))');
    expect(props.functions[27].functionName).toEqual(
      'registerOperatorWithCoordinator(bytes,(uint256,uint256),string,(uint8,address,(uint256,uint256))[],(bytes,bytes32,uint256))'
    );
  });

  it('validate Abi.json path field', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/xxx.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'transfer()',
            },
          },
        ],
      },
    };

    await expect(
      generateAbis([ds], PROJECT_PATH, undefined as any, undefined as any, undefined as any)
    ).rejects.toThrow(/Asset: "erc20" not found in project/);
  });

  it('validate Abi.json Function Not Exist', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'approve(address a,uint256 b)',
            },
          },
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'approve222(address a,uint256 b)',
            },
          },
        ],
      },
    };

    await expect(
      generateAbis([ds], PROJECT_PATH, undefined as any, undefined as any, undefined as any)
    ).rejects.toThrow(/Function: "approve222\(address a,uint256 b\)" not found in erc20 contract interface/);
  });

  it('validate Abi.json Topic Not Exist', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)'],
            },
          },
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)', 'NotExist(address a)'],
            },
          },
        ],
      },
    };

    await expect(
      generateAbis([ds], PROJECT_PATH, undefined as any, undefined as any, undefined as any)
    ).rejects.toThrow(/Topic: "NotExist\(address a\)" not found in erc20 contract interface/);
  });

  it('validates abi with !null filter', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)', undefined, undefined, NOT_NULL_FILTER],
            },
          },
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)', undefined, undefined, null],
            },
          },
        ],
      },
    };

    await expect(
      generateAbis(
        [ds],
        PROJECT_PATH,
        (p) => Promise.resolve(),
        (v) => v as any,
        () => Promise.resolve()
      )
    ).resolves.not.toThrow();
  });

  it('doesnt validate if datasource has no abi option set', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      assets: new Map([['erc20', {file: './abis/erc20.json'}]]),
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)'],
            },
          },
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)', 'NotExist(address a)'],
            },
          },
        ],
      },
    };

    await expect(
      generateAbis(
        [ds],
        PROJECT_PATH,
        (p) => Promise.resolve(),
        (v) => v as any,
        () => Promise.resolve()
      )
    ).resolves.not.toThrow();
  });

  it('abi option is exist, but assets option is not configured.', async () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'erc20',
        address: '',
      },
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)'],
            },
          },
          {
            handler: 'handleTransaction',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address a,address b,uint256 c)', 'NotExist(address a)'],
            },
          },
        ],
      },
    } as any;

    await expect(
      generateAbis([ds], PROJECT_PATH, undefined as any, undefined as any, undefined as any)
    ).rejects.toThrow('Asset: "erc20" not found in project');
  });
});
