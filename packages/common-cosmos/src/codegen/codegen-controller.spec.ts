// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {SubqlCosmosRuntimeDatasource} from '@subql/types-cosmos';
import ejs from 'ejs';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {
  isProtoPath,
  prepareCosmwasmJobs,
  prepareProtobufRenderProps,
  prepareSortedAssets,
  processProtoFilePath,
  tempProtoDir,
} from './codegen-controller';
import {loadCosmwasmAbis} from './util';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');

describe('Codegen cosmos', () => {
  describe('Protobuf to ts', () => {
    it('process protobuf file paths', () => {
      const p = './proto/cosmos/osmosis/poolmanager/v1beta1/swap_route.proto';
      expect(processProtoFilePath(p)).toBe('./proto-interfaces/cosmos/osmosis/poolmanager/v1beta1/swap_route');
    });
    it('should output correct protobuf render props', () => {
      const mockChainTypes = [
        {
          'osmosis.gamm.v1beta1': {
            file: './proto/osmosis/gamm/v1beta1/tx.proto',
            messages: ['MsgSwapExactAmountIn'],
          },
        },
        {
          'osmosis.poolmanager.v1beta1': {
            file: './proto/osmosis/poolmanager/v1beta1/swap_route.proto',
            messages: ['SwapAmountInRoute'],
          },
        },
      ];
      expect(prepareProtobufRenderProps(mockChainTypes, PROJECT_PATH)).toStrictEqual([
        {
          messageNames: ['MsgSwapExactAmountIn'],
          path: './proto-interfaces/osmosis/gamm/v1beta1/tx',
        },
        {
          messageNames: ['SwapAmountInRoute'],
          path: './proto-interfaces/osmosis/poolmanager/v1beta1/swap_route',
        },
      ]);
    });
    it('prepareProtobufRenderProps should handle undefined and array undefined', () => {
      const mixedMockChainTypes = [
        {
          'osmosis.poolmanager.v1beta1': {
            file: './proto/osmosis/poolmanager/v1beta1/swap_route.proto',
            messages: ['SwapAmountInRoute'],
          },
        },
        undefined,
      ];
      expect(prepareProtobufRenderProps(mixedMockChainTypes, PROJECT_PATH)).toStrictEqual([
        {
          messageNames: ['SwapAmountInRoute'],
          path: './proto-interfaces/osmosis/poolmanager/v1beta1/swap_route',
        },
      ]);
      expect(prepareProtobufRenderProps(undefined, PROJECT_PATH)).toStrictEqual([]);
      expect(prepareProtobufRenderProps([undefined], PROJECT_PATH)).toStrictEqual([]);
    });
    it('Should throw if path to protobuf does not exist', () => {
      const mockChainTypes = [
        {
          'osmosis.gamm.v1beta1': {
            file: './protato/osmosis/gamm/v1beta1/tx.proto',
            messages: ['MsgSwapExactAmountIn'],
          },
        },
      ];
      expect(() => prepareProtobufRenderProps(mockChainTypes, PROJECT_PATH)).toThrow(
        'Error: chainType osmosis.gamm.v1beta1, file ./protato/osmosis/gamm/v1beta1/tx.proto does not exist'
      );
    });
    it('ensure correct regex for protoPath', () => {
      let p = './proto/cosmos/osmosis/gamm/v1beta1/tx.proto';
      expect(isProtoPath(p, PROJECT_PATH)).toBe(true);
      p = 'proto/cosmos/osmosis/gamm/v1beta1/tx.proto';
      expect(isProtoPath(p, PROJECT_PATH)).toBe(true);
      p = '../proto/cosmos/osmosis/gamm/v1beta1/tx.proto';
      expect(isProtoPath(p, PROJECT_PATH)).toBe(false);
      p = './protos/cosmos/osmosis/gamm/v1beta1/tx.proto';
      expect(isProtoPath(p, PROJECT_PATH)).toBe(false);
    });
    it('User provided common protos should only overwrite the provided .proto file', async () => {
      const tp = await tempProtoDir(PROJECT_PATH);
      const v = await fs.promises.readFile(path.join(tp, './cosmos/base/v1beta1/coin.proto'));
      expect(v.toString()).toBe('fake proto');
      await promisify(rimraf)(tp);
    });
  });

  describe('CosmWasm codegen', () => {
    it('ensure prepareSortedAssets', () => {
      const cosmosDs = {
        kind: 'cosmos/Runtime',
        startBlock: 6000000,
        options: {abi: 'cw20'},
        assets: {cw20: {file: './cosmwasm-contract/cw20/schema/cw20.json'}} as unknown as Map<string, {file: string}>,
        mapping: {
          file: './dist/index.js',
          handlers: [
            {
              handler: 'handleMessage',
              kind: 'cosmos/MessageHandler',
              filter: {type: '/cosmwasm.wasm.v1.MsgExecuteContract'},
            },
          ],
        },
      } as SubqlCosmosRuntimeDatasource;
      const expectedOutput = new Map<string, string>([
        ['cw20', path.join(PROJECT_PATH, 'cosmwasm-contract/cw20/schema/cw20.json')],
      ]);

      expect(prepareSortedAssets([cosmosDs], PROJECT_PATH)).toStrictEqual(expectedOutput);
    });
    it('sortedAssets should only be of cosmosDs', () => {
      const notCosmosDs = {
        kind: 'ethereum/Runtime',
        startBlock: 6000000,
        options: {abi: 'cw20'},
        assets: {cw20: {file: './cosmwasm-contract/cw20/schema/cw20.json'}} as unknown as Map<string, {file: string}>,
        mapping: {
          file: './dist/index.js',
          handlers: [
            {
              handler: 'handleMessage',
              kind: 'cosmos/MessageHandler',
              filter: {type: '/cosmwasm.wasm.v1.MsgExecuteContract'},
            },
          ],
        },
      } as any;

      expect(prepareSortedAssets([notCosmosDs], PROJECT_PATH)).toStrictEqual({});
    });
    it('Correct output on processCosmwasm render jobs', () => {
      const mockSortedAssets = {
        cw20: path.join(PROJECT_PATH, 'cosmwasm-contract/cw20/schema/cw20.json'),
      };
      expect(prepareCosmwasmJobs(mockSortedAssets, loadCosmwasmAbis, upperFirst)).toStrictEqual([
        {
          contract: 'Cw20',
          messages: {
            MsgInstantiateContract: 'InstantiateMsg',
            MsgExecuteContract: 'ExecuteMsg',
          },
        },
      ]);
    });
    it('render correct codegen from ejs', async () => {
      const mockJob = {
        contract: 'Cw20',
        messages: {
          MsgInstantiateContract: 'InstantiateMsg',
          MsgExecuteContract: 'ExecuteMsg',
        },
      };

      const data = await ejs.renderFile(path.resolve(__dirname, '../../templates/cosmwasm-interfaces.ts.ejs'), {
        props: {abi: mockJob},
        helper: {upperFirst},
      });
      await fs.promises.writeFile(path.join(PROJECT_PATH, 'test.ts'), data);
      const expectCodegen =
        '' +
        '// SPDX-License-Identifier: Apache-2.0\n' +
        '\n' +
        '// Auto-generated, DO NOT EDIT\n' +
        'import { CosmosMessage, MsgInstantiateContract,MsgExecuteContract } from "@subql/types-cosmos";\n' +
        '\n' +
        'import { InstantiateMsg, ExecuteMsg } from "../cosmwasm-interfaces/Cw20.types";\n' +
        '\n' +
        '\n' +
        'export type Cw20InstantiateMsg = CosmosMessage<MsgInstantiateContract<InstantiateMsg>>;\n' +
        '\n' +
        'export type Cw20ExecuteMsg = CosmosMessage<MsgExecuteContract<ExecuteMsg>>;\n';

      const output = await fs.promises.readFile(path.join(PROJECT_PATH, 'test.ts'));
      expect(output.toString()).toMatch(expectCodegen);
      await promisify(rimraf)(path.join(PROJECT_PATH, 'test.ts'));
    });
  });
});
