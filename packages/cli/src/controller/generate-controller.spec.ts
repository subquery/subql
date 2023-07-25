// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {FunctionFragment} from '@ethersproject/abi/src.ts/fragments';
import {EthereumDatasourceKind, EthereumHandlerKind} from '@subql/common-ethereum';
import {SubqlRuntimeDatasource as EthereumDs, EthereumLogFilter} from '@subql/types-ethereum';
import {parseContractPath} from 'typechain';
import {SelectedMethod, UserInput} from '../commands/codegen/generate';
import {
  constructDatasources,
  constructHandlerProps,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlerName,
  getAbiInterface,
  promptSelectables,
} from './generate-controller';

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

const mockDsFn = (): EthereumDs[] => [
  {
    kind: EthereumDatasourceKind.Runtime,
    startBlock: 1,
    options: {
      abi: 'Erc721',
      address: '',
    },
    assets: {
      erc721: {file: 'erc721.json'},
    } as unknown as Map<string, {file: string}>,
    mapping: {
      file: '',
      handlers: [
        {
          handler: 'handleTransaction',
          kind: EthereumHandlerKind.Call,
          filter: {
            function: 'approve(address,uint256)',
          },
        },
        {
          handler: 'handleLog',
          kind: EthereumHandlerKind.Event,
          filter: {
            topics: ['Transfer(address,address,uint256)'],
          },
        },
      ],
    },
  },
];

const projectPath = path.join(__dirname, '../../test/schemaTest6');

describe('CLI codegen:generate', () => {
  const abiInterface = getAbiInterface(projectPath, './erc721.json');
  const abiName = parseContractPath('./erc721.json').name;
  const eventsFragments = abiInterface.events;
  const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

  it('Construct correct datasources', () => {
    const mockUserInput: UserInput = {
      startBlock: 1,
      functions: mockConstructedFunctions,
      events: mockConstructedEvents,
      abiPath: './abis/erc721.json',
      address: 'aaa',
    };
    const construcedDs = constructDatasources(mockUserInput);
    const expectedAsset = new Map();
    expectedAsset.set('Erc721', {file: './abis/erc721.json'});
    expect(construcedDs).toStrictEqual({
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 1,
      options: {
        abi: 'Erc721',
        address: 'aaa',
      },
      assets: expectedAsset,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handleTransferFromErc721Tx',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'transferFrom(address,address,uint256)',
            },
          },
          {
            handler: 'handleApprovalErc721Log',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Approval(address,address,uint256)'],
            },
          },
        ],
      },
    });
  });
  it('Prompt Selectables, should return all methods, if user passes --events="*"', async () => {
    const result = await promptSelectables('event', eventsFragments, '*', abiName);
    expect(result).toEqual(
      expect.arrayContaining([
        'Approval(address,address,uint256)',
        'Transfer(address,address,uint256)',
        'ApprovalForAll(address,address,bool)',
      ])
    );
  });

  it('Prompt Selectables, no events passed, should prompt through inquirer', async () => {
    // when using ejs, jest spyOn does not work on inquirer
    const inquirer = require('inquirer');

    const promptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
      event: ['Approval(address,address,uint256)'],
    });

    const result = await promptSelectables('event', eventsFragments, '', abiName);
    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expect.arrayContaining(['Approval(address,address,uint256)']));
  });
  it('Prompt Selectables, --functions="transferFrom", should return matching fragment method (cased insensitive)', async () => {
    const result = await promptSelectables('function', functionFragments, 'transferFrom', abiName);
    const insensitiveInputResult = await promptSelectables('function', functionFragments, 'transFerfrom', abiName);

    expect(result).toEqual(expect.arrayContaining(['transferFrom(address,address,uint256)']));
    expect(insensitiveInputResult).toEqual(expect.arrayContaining(['transferFrom(address,address,uint256)']));
  });
  it('Prompt Selectables, should throw if typo is parsed', async () => {
    await expect(promptSelectables('function', functionFragments, 'asdfghj', abiName)).rejects.toThrow(
      '"asdfghj" is not a valid function on ABI: Erc721'
    );
  });
  it('Ensure generateHandlerName', () => {
    expect(generateHandlerName('transfer', 'erc721', 'log')).toBe('handleTransferErc721Log');
  });
  it('Ensure ConstructHandlerProps', () => {
    const functionMethods = [{name: 'transfer', method: 'transfer(address,uint256)'}];
    const eventsMethods = [{name: 'Approval', method: 'Approval(address,address,uint256)'}];

    const result = constructHandlerProps([eventsMethods, functionMethods], abiName);
    expect(result).toStrictEqual({
      name: 'Erc721',
      handlers: [
        {
          name: 'handleTransfer',
          argName: 'tx',
          argType: 'TransferTransaction',
        },
        {name: 'handleApproval', argName: 'log', argType: 'ApprovalLog'},
      ],
    });
  });
  it('FilterObjectsByStatMutability', () => {
    const mockData = {
      'transfer(address,uint256)': {
        type: 'function',
        name: 'transfer',
        constant: false,
        inputs: [[], []] as any,
        outputs: [[]] as any,
        payable: false,
        stateMutability: 'nonpayable',
        gas: null as any,
        _isFragment: true,
      },
      'allowance(address,address)': {
        type: 'function',
        name: 'allowance',
        constant: true,
        inputs: [[], []] as any,
        outputs: [[]] as any,
        payable: false,
        stateMutability: 'view',
        gas: null as any,
        _isFragment: true,
      },
    };
    const filteredResult = filterObjectsByStateMutability(mockData as any as Record<string, FunctionFragment>);

    expect(filteredResult).toEqual({
      'transfer(address,uint256)': {
        type: 'function',
        name: 'transfer',
        constant: false,
        inputs: [[], []] as any,
        outputs: [[]] as any,
        payable: false,
        stateMutability: 'nonpayable',
        gas: null as any,
        _isFragment: true,
      },
    } as any);
  });
  it('filter existing filters on datasources', () => {
    const ds = mockDsFn();
    const mockUserEvents = [
      {
        name: 'Approval',
        method: 'Approval(address,address,uint256)',
      },
      {
        name: 'Transfer', // should be ignored
        method: 'Transfer(address,address,uint256)',
      },
    ];
    const mockUserFunctions = [
      {
        name: 'transferFrom',
        method: 'transferFrom(address,address,uint256)',
      },
      {
        name: 'approve', // should be ignored
        method: 'approve(address,uint256)',
      },
    ];
    const mockUserInput: UserInput = {
      startBlock: 1,
      functions: mockUserFunctions,
      events: mockUserEvents,
      abiPath: './abis/erc721.json',
      address: 'aaa',
    };

    const result = filterExistingMethods(mockUserInput, ds);

    expect(result).toStrictEqual([
      [
        {
          name: 'Approval',
          method: 'Approval(address,address,uint256)',
        },
      ],
      [
        {
          name: 'transferFrom',
          method: 'transferFrom(address,address,uint256)',
        },
      ],
    ]);
  });
  it('filter out different formatted filters', () => {
    const ds = mockDsFn();
    const logHandler = ds[0].mapping.handlers[1].filter as EthereumLogFilter;
    logHandler.topics = ['Transfer(address indexed from, address indexed to, uint256 amount)'];
  });
});
