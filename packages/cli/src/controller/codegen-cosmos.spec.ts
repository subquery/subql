// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {loadFromJsonOrYaml, makeTempDir} from '@subql/common';
import rimraf from 'rimraf';
import {
  isProtoPath,
  prepareProtobufRenderProps,
  processProtoFilePath,
  tempProtoDir,
  validateCosmosManifest,
} from './codegen-controller';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');
describe('Codegen cosmos, protobuf to ts', () => {
  // afterEach(async () => {
  // })
  it('process protobuf file paths', () => {
    const p = './proto/cosmos/osmosis/poolmanager/v1beta1/swap_route.proto';
    expect(processProtoFilePath(p)).toBe('./cosmos/osmosis/poolmanager/v1beta1/swap_route');

    // test for if from node_modules
    // or any other
  });

  it('should output correct protobuf render props', () => {
    const mockChainTypes = [
      {
        'osmosis.gamm.v1beta1': {
          file: './proto/cosmos/osmosis/gamm/v1beta1/tx.proto',
          messages: ['MsgSwapExactAmountIn'],
        },
      },
      {
        'osmosis.poolmanager.v1beta1': {
          file: './proto/cosmos/osmosis/poolmanager/v1beta1/swap_route.proto',
          messages: ['SwapAmountInRoute'],
        },
      },
    ] as any;

    expect(prepareProtobufRenderProps(mockChainTypes, PROJECT_PATH)).toStrictEqual([
      {
        messageNames: ['MsgSwapExactAmountIn'],
        path: './cosmos/osmosis/gamm/v1beta1/tx',
      },
      {
        messageNames: ['SwapAmountInRoute'],
        path: './cosmos/osmosis/poolmanager/v1beta1/swap_route',
      },
    ]);
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
    const ethManifest = loadFromJsonOrYaml(
      path.join(__dirname, '../../test/schemaTest6', 'generate-project.yaml')
    ) as any;
    expect(validateCosmosManifest(cosmosManifest)).toBe(true);
    expect(validateCosmosManifest(ethManifest)).toBe(false);
  });
});
