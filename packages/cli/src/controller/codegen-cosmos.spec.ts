// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {prepareProtobufRenderProps, processProtoFilePath} from './codegen-controller';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');
describe('Codegen cosmos, protobuf to ts', () => {
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
});
