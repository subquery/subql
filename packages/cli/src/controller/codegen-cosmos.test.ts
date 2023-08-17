// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {generateProto} from './codegen-controller';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');

describe('Able to generate cosmos types from protobuf', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/protoTest1/src'));
  });

  it('Able to generate ts types from protobufs', async () => {
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
    const expectedGeneratedCode =
      '' +
      `// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {CosmosMessage} from "@subql/types-cosmos";

import {MsgSwapExactAmountIn} from "./cosmos/osmosis/gamm/v1beta1/tx";

import {SwapAmountInRoute} from "./cosmos/osmosis/poolmanager/v1beta1/swap_route";


export type WrappedMsgSwapExactAmountIn = CosmosMessage<MsgSwapExactAmountIn>;

export type WrappedSwapAmountInRoute = CosmosMessage<SwapAmountInRoute>;

`;

    await generateProto(mockChainTypes, PROJECT_PATH);
    const codegenResult = await fs.promises.readFile(
      path.join(PROJECT_PATH, '/src/types/proto-interfaces/wrappedMessageTypes.ts')
    );
    expect(fs.existsSync(`${PROJECT_PATH}/src/types/proto-interfaces/wrappedMessageTypes.ts`)).toBeTruthy();
    expect(codegenResult.toString()).toBe(expectedGeneratedCode);
  });
});
