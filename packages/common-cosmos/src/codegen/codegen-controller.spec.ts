// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {isProtoPath, prepareProtobufRenderProps, processProtoFilePath} from './codegen-controller';
import {validateCosmosManifest} from './util';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');

describe('Codegen cosmos, protobuf to ts', () => {
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
    ] as any;
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
  it('Should throw if path to protobuf does not exist', () => {
    const mockChainTypes = [
      {
        'osmosis.gamm.v1beta1': {
          file: './protato/osmosis/gamm/v1beta1/tx.proto',
          messages: ['MsgSwapExactAmountIn'],
        },
      },
    ] as any;
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
  it('Ensure correctness on Cosmos Manifest validate', () => {
    const cosmosManifest = loadFromJsonOrYaml(path.join(PROJECT_PATH, 'project.yaml')) as any;
    const ethManifest = loadFromJsonOrYaml(path.join(PROJECT_PATH, 'bad-cosmos-project.yaml')) as any;
    expect(validateCosmosManifest(cosmosManifest)).toBe(true);
    expect(validateCosmosManifest(ethManifest)).toBe(false);
  });
});
