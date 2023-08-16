// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import os from 'os';
import path from 'path';
import {EventFragment, FunctionFragment} from '@ethersproject/abi/src.ts/fragments';
import {EthereumDatasourceKind, EthereumHandlerKind, EthereumTransactionFilter} from '@subql/common-ethereum';
import {SubqlRuntimeDatasource as EthereumDs, EthereumLogFilter} from '@subql/types-ethereum';
import {parseContractPath} from 'typechain';
import {SelectedMethod, UserInput} from '../commands/codegen/generate';
import {resolveToAbsolutePath} from '../utils';
import {
  constructDatasources,
  constructHandlerProps,
  constructMethod,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlerName,
  getAbiInterface,
  prepareInputFragments,
  removeKeyword,
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

describe('CLI codegen:generate', () => {
  const projectPath = path.join(__dirname, '../../test/schemaTest6');
  const abiInterface = getAbiInterface(projectPath, './erc721.json');
  const abiName = parseContractPath('./erc721.json').name;
  const eventFragments = abiInterface.events;
  const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

  it('Construct correct datasources', () => {
    const mockUserInput: UserInput = {
      startBlock: 1,
      functions: mockConstructedFunctions,
      events: mockConstructedEvents,
      abiPath: './abis/erc721.json',
      address: 'aaa',
    };
    const constructedDs = constructDatasources(mockUserInput);
    const expectedAsset = new Map();
    expectedAsset.set('Erc721', {file: './abis/erc721.json'});
    expect(constructedDs).toStrictEqual({
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
  it('prepareInputFragments, should return all fragments, if user passes --events="*"', async () => {
    const result = await prepareInputFragments('event', '*', eventFragments, abiName);
    expect(result).toStrictEqual(abiInterface.events);
  });
  it('prepareInputFragments, no method passed, should prompt through inquirer', async () => {
    // when using ejs, jest spyOn does not work on inquirer
    const inquirer = require('inquirer');

    const promptSpy = jest.spyOn(inquirer, 'prompt').mockResolvedValue({
      event: ['Approval(address,address,uint256)'],
    });

    const emptyStringPassed = await prepareInputFragments('event', '', eventFragments, abiName);
    expect(promptSpy).toHaveBeenCalledTimes(1);
    const undefinedPassed = await prepareInputFragments('event', undefined, eventFragments, abiName);

    expect(emptyStringPassed).toStrictEqual(undefinedPassed);
  });
  it('prepareInputFragments, --functions="transferFrom", should return matching fragment method (cased insensitive)', async () => {
    const result = await prepareInputFragments<FunctionFragment>(
      'function',
      'transferFrom',
      functionFragments,
      abiName
    );
    const insensitiveInputResult = await prepareInputFragments<FunctionFragment>(
      'function',
      'transFerfrom',
      functionFragments,
      abiName
    );

    expect(result).toStrictEqual(insensitiveInputResult);
    expect(result).toStrictEqual({
      'transferFrom(address,address,uint256)': abiInterface.functions['transferFrom(address,address,uint256)'],
    });
  });
  it('should throw when passing invalid methods', async () => {
    await expect(
      prepareInputFragments<FunctionFragment>(
        'function',
        'transFerfrom(address,address,uint256)',
        functionFragments,
        abiName
      )
    ).rejects.toThrow("'transFerfrom(address' is not a valid function on Erc721");
    await expect(
      prepareInputFragments<FunctionFragment>(
        'function',
        'transferFrom(address from, address to, uint256 tokenid)',
        functionFragments,
        abiName
      )
    ).rejects.toThrow("'transferFrom(address from' is not a valid function on Erc721");

    await expect(prepareInputFragments('function', 'asdfghj', functionFragments, abiName)).rejects.toThrow(
      "'asdfghj' is not a valid function on Erc721"
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
          name: 'handleTransferErc721Tx',
          argName: 'tx',
          argType: 'TransferTransaction',
        },
        {name: 'handleApprovalErc721Log', argName: 'log', argType: 'ApprovalLog'},
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
  it('filter out existing methods, input address === undefined && ds address === "", should filter', () => {
    const ds = mockDsFn();
    ds[0].options.address = '';
    const [cleanEvents, cleanFunctions] = filterExistingMethods(eventFragments, functionFragments, ds, undefined);
    // function approve should be filtered out
    // event transfer should be filtered out
    expect(cleanEvents).toStrictEqual({
      'Approval(address,address,uint256)': eventFragments['Approval(address,address,uint256)'],
      'ApprovalForAll(address,address,bool)': eventFragments['ApprovalForAll(address,address,bool)'],
    });
    expect(cleanEvents['Transfer(address,address,uint256)']).toBeFalsy();
    expect(cleanFunctions['approve(address,uint256)']).toBeFalsy();
  });
  it('filter out existing methods, only on matching address', () => {
    const ds = mockDsFn();
    ds[0].options.address = '0x892476D79090Fa77C6B9b79F68d21f62b46bEDd2';
    const [cleanEvents, cleanFunctions] = filterExistingMethods(eventFragments, functionFragments, ds, 'zzz');
    const constructedEvents: SelectedMethod[] = constructMethod<EventFragment>(cleanEvents);
    const constructedFunctions: SelectedMethod[] = constructMethod<FunctionFragment>(cleanFunctions);

    expect(constructedEvents.length).toBe(Object.keys(eventFragments).length);
    expect(constructedFunctions.length).toBe(Object.keys(functionFragments).length);
  });
  it('filter out existing methods, inputAddress === undefined || "" should filter all ds that contains no address ', () => {
    const ds = mockDsFn();
    ds[0].options.address = undefined;
    const [cleanEvents, cleanFunctions] = filterExistingMethods(eventFragments, functionFragments, ds, undefined);

    expect(cleanEvents).toStrictEqual({
      'Approval(address,address,uint256)': eventFragments['Approval(address,address,uint256)'],
      'ApprovalForAll(address,address,bool)': eventFragments['ApprovalForAll(address,address,bool)'],
    });
    expect(cleanEvents['Transfer(address,address,uint256)']).toBeFalsy();
    expect(cleanFunctions['approve(address,uint256)']).toBeFalsy();
  });
  it('filter out different formatted filters', () => {
    const ds = mockDsFn();
    ds[0].options.address = 'zzz';
    const logHandler = ds[0].mapping.handlers[1].filter as EthereumLogFilter;
    const txHandler = ds[0].mapping.handlers[0].filter as EthereumTransactionFilter;
    txHandler.function = 'approve(address to, uint256 tokenId)';
    logHandler.topics = ['Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'];

    // should filter out approve and Transfer
    const [cleanEvents, cleanFunctions] = filterExistingMethods(eventFragments, functionFragments, ds, 'zzz');
    const constructedEvents: SelectedMethod[] = constructMethod<EventFragment>(cleanEvents);
    const constructedFunctions: SelectedMethod[] = constructMethod<FunctionFragment>(cleanFunctions);

    expect(constructedEvents).toStrictEqual([
      {name: 'Approval', method: 'Approval(address,address,uint256)'},
      {
        name: 'ApprovalForAll',
        method: 'ApprovalForAll(address,address,bool)',
      },
    ]);

    expect(constructedFunctions).toStrictEqual([
      {
        name: 'safeTransferFrom',
        method: 'safeTransferFrom(address,address,uint256)',
      },
      {
        name: 'safeTransferFrom',
        method: 'safeTransferFrom(address,address,uint256,bytes)',
      },
      {
        name: 'setApprovalForAll',
        method: 'setApprovalForAll(address,bool)',
      },
      {
        name: 'transferFrom',
        method: 'transferFrom(address,address,uint256)',
      },
    ]);
  });
  it('removeKeyword, should only remove expect value', () => {
    let inputString = 'event ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved)';
    expect(removeKeyword(inputString)).toBe(
      'ApprovalForAll(address indexed _owner, address indexed _operator, bool _approved)'
    );

    inputString = 'function balanceOf(address _owner) external view returns (uint256)';
    expect(removeKeyword(inputString)).toBe('balanceOf(address _owner) external view returns (uint256)');

    inputString = 'balanceOf(address _owner) external view returns (uint256)';
    expect(removeKeyword(inputString)).toBe('balanceOf(address _owner) external view returns (uint256)');
  });
  it('Able to read from artifacts and abis', () => {
    const mockPath_1 = path.join(__dirname, '../../test/abiTest1/');
    const mockPath_2 = path.join(__dirname, '../../test/abiTest2/');

    expect(getAbiInterface(mockPath_1, 'abis.json')).toBeTruthy();
    expect(getAbiInterface(mockPath_1, 'artifact.json')).toBeTruthy();

    expect(() => getAbiInterface(mockPath_2, 'artifact.json')).toThrow('Provided ABI is not a valid ABI or Artifact');
  });
  it('resolve to absolutePath from tilde', () => {
    const tildePath = '~/Downloads/example.file';
    expect(resolveToAbsolutePath(tildePath)).toBe(`${os.homedir()}/Downloads/example.file`);
  });
  it('if absolutePath regex should not do anything', () => {
    const absolutePath = '/root/Downloads/example.file';
    expect(resolveToAbsolutePath(absolutePath)).toBe(absolutePath);
  });
  it('if relative path regex should resolve it to absolute', () => {
    let relativePath = './Downloads/example.file';
    expect(resolveToAbsolutePath(relativePath)).toBe('Downloads/example.file');
    relativePath = '../Downloads/example.file';
    expect(resolveToAbsolutePath(relativePath)).toBe(relativePath);
  });
});
