// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {EthereumDatasourceKind, EthereumHandlerKind} from '@subql/types-ethereum';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {abiInterface, joinInputAbiName, prepareAbiJob, prepareSortedAssets} from './codegen-controller';

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
    } as abiInterface;
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
    } as abiInterface;
    expect(joinInputAbiName(mockAbiInterface)).toMatch('initialize_string_string_string_address_arr_');
  });

  it('json is object without abi field or empty abi json, should throw', () => {
    const artifactAssetObj: Record<string, string> = {
      artifact: './abis/bad-erc20.json',
    };

    expect(() =>
      prepareAbiJob(artifactAssetObj, PROJECT_PATH, (filePath) =>
        require(path.join(PROJECT_PATH, './abis/bad-erc20.json'))
      )
    ).toThrow('Provided ABI is not a valid ABI or Artifact');
  });
  it('Empty abi json, should throw', () => {
    const projectPath = path.join(__dirname, '../../test/abiTest2');

    const artifactAssetObj = {
      artifact: './artifact.json',
    };

    expect(() => prepareAbiJob(artifactAssetObj, projectPath, (filePath) => [])).toThrow(
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
      assets: {
        erc20: {file: './abis/erc20.json'},
      } as unknown as Map<string, {file: string}>,
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

    const a = path.join(projectPath, './abis/erc20.json');
    const b = path.join(projectPath, './abis/Erc20.sol/Erc20.json');

    const abisRendered = prepareAbiJob(abisAssetObj, projectPath, (filePath) => require(a));
    const artifactRendered = prepareAbiJob(artifactAssetObj, projectPath, (filePath) => require(b));

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
      'import {EthereumLog, EthereumTransaction} from "@subql/types-ethereum";\n' +
      '\n' +
      "import {ApprovalEvent, Erc20} from '../contracts/Erc20'\n" +
      '\n' +
      '\n' +
      'export type ApprovalLog = EthereumLog<ApprovalEvent["args"]>\n' +
      '\n' +
      '\n' +
      "export type Transaction = EthereumTransaction<Parameters<Erc20['functions']['approve']>>";
    const output = await fs.promises.readFile(path.join(PROJECT_PATH, 'test.ts'));
    expect(output.toString()).toMatch(expectedCodegen);
    await promisify(rimraf)(path.join(PROJECT_PATH, 'test.ts'));
  });
});
