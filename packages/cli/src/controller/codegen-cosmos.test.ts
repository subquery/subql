// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import {generateProto, tempProtoDir} from '@subql/common-cosmos';
import {upperFirst} from 'lodash';
import rimraf from 'rimraf';
import {prepareDirPath, renderTemplate} from '../utils';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');
const MOCK_CHAINTYPES = [
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
jest.setTimeout(50000);
describe('Able to generate cosmos types from protobuf', () => {
  afterEach(async () => {
    await promisify(rimraf)(path.join(__dirname, '../../test/protoTest1/src'));
  });

  it('Able to generate ts types from protobufs', async () => {
    const expectedGeneratedCode =
      '' +
      `// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {CosmosMessage} from "@subql/types-cosmos";

import {MsgSwapExactAmountIn} from "./proto-interfaces/osmosis/gamm/v1beta1/tx";

import {SwapAmountInRoute} from "./proto-interfaces/osmosis/poolmanager/v1beta1/swap_route";


export type MsgSwapExactAmountInMessage = CosmosMessage<MsgSwapExactAmountIn>;

export type SwapAmountInRouteMessage = CosmosMessage<SwapAmountInRoute>;
`;
    await generateProto(MOCK_CHAINTYPES, PROJECT_PATH, prepareDirPath, renderTemplate, upperFirst, tempProtoDir);
    const codegenResult = await fs.promises.readFile(path.join(PROJECT_PATH, '/src/types/CosmosMessageTypes.ts'));
    expect(fs.existsSync(`${PROJECT_PATH}/src/types/CosmosMessageTypes.ts`)).toBeTruthy();
    expect(codegenResult.toString()).toBe(expectedGeneratedCode);
  });
  it('On missing protobuf dependency should throw', async () => {
    const tmpDir = await tempProtoDir(PROJECT_PATH);
    const badChainTypes = [
      {
        'osmosis.gamm.v1beta1': {
          file: './proto/cosmos/osmosis/gamm/v1beta1/tx.proto',
          messages: ['MsgSwapExactAmountIn'],
        },
      },
    ];
    await expect(
      generateProto(badChainTypes, PROJECT_PATH, prepareDirPath, renderTemplate, upperFirst, () =>
        Promise.resolve(tmpDir)
      )
    ).rejects.toThrow(
      'Failed to generate from protobufs. Error: chainType osmosis.gamm.v1beta1, file ./proto/cosmos/osmosis/gamm/v1beta1/tx.proto does not exist'
    );
    expect(fs.existsSync(tmpDir)).toBe(false);
  });
  it('create temp dir with all protobufs', async () => {
    // user Protobufs should not be overwritten
    const preFile = await fs.promises.readFile(path.join(PROJECT_PATH, 'proto/osmosis/gamm/v1beta1/tx.proto'));
    const tmpDir = await tempProtoDir(PROJECT_PATH);
    const afterFile = await fs.promises.readFile(path.join(tmpDir, 'osmosis/gamm/v1beta1/tx.proto'));
    expect(preFile.toString()).toBe(afterFile.toString());
    await promisify(rimraf)(tmpDir);
  });
  it('tmpDirectory should be removed after codegen', async () => {
    const tmpDir = await tempProtoDir(PROJECT_PATH);
    await generateProto(MOCK_CHAINTYPES, PROJECT_PATH, prepareDirPath, renderTemplate, upperFirst, () =>
      Promise.resolve(tmpDir)
    );
    expect(fs.existsSync(tmpDir)).toBe(false);
  });
});
