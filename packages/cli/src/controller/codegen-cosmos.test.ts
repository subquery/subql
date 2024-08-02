// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {projectCodegen} from '@subql/common-cosmos';
import {ProjectManifestV1_0_0} from '@subql/types-core';
import type {CosmosDatasource, CustomDatasourceTemplate, RuntimeDatasourceTemplate} from '@subql/types-cosmos';
import {upperFirst} from 'lodash';
import {rimraf} from 'rimraf';
import {prepareDirPath, renderTemplate} from '../utils';

const PROJECT_PATH = path.join(__dirname, '../../test/protoTest1');
const MOCK_CHAINTYPES: any = {
  'osmosis.gamm.v1beta1': {
    file: './proto/osmosis/gamm/v1beta1/tx.proto',
    messages: ['MsgSwapExactAmountIn'],
  },
  'osmosis.poolmanager.v1beta1': {
    file: './proto/osmosis/poolmanager/v1beta1/swap_route.proto',
    messages: ['SwapAmountInRoute'],
  },
};

jest.setTimeout(30000);

describe('Able to generate cosmos types from protobuf', () => {
  afterEach(async () => {
    await rimraf(path.join(__dirname, '../../test/protoTest1/src'));
  });

  const manifest = loadFromJsonOrYaml(path.join(PROJECT_PATH, 'project.yaml')) as ProjectManifestV1_0_0<
    CosmosDatasource,
    RuntimeDatasourceTemplate | CustomDatasourceTemplate,
    any
  >;

  it('Able to generate ts types from protobufs', async () => {
    const expectedGeneratedCode =
      '' +
      `// SPDX-License-Identifier: Apache-2.0

// Auto-generated , DO NOT EDIT
import {CosmosMessage} from "@subql/types-cosmos";

import * as OsmosisGammV1beta1Tx from "./proto-interfaces/osmosis/gamm/v1beta1/tx";


export namespace osmosis.gamm.v1beta1.tx {

  export type MsgSwapExactAmountInMessage = CosmosMessage<OsmosisGammV1beta1Tx.MsgSwapExactAmountIn>;
}

`;

    manifest.network.chaintypes = MOCK_CHAINTYPES;
    await projectCodegen([manifest], PROJECT_PATH, prepareDirPath, renderTemplate, upperFirst, []);
    const codegenResult = await fs.promises.readFile(path.join(PROJECT_PATH, '/src/types/CosmosMessageTypes.ts'));
    expect(fs.existsSync(`${PROJECT_PATH}/src/types/CosmosMessageTypes.ts`)).toBeTruthy();
    expect(codegenResult.toString()).toBe(expectedGeneratedCode);
  });

  it('On missing protobuf dependency should throw', async () => {
    const badChainType = {
      'osmosis.gamm.v1beta1': {
        file: './proto/cosmos/osmosis/gamm/v1beta1/tx.proto',
        messages: ['MsgSwapExactAmountIn'],
      },
    };
    manifest.network.chaintypes = badChainType;
    await expect(() =>
      projectCodegen([manifest], PROJECT_PATH, prepareDirPath, renderTemplate, upperFirst, [])
    ).rejects.toThrow(
      'Failed to generate from protobufs. Error: chainType osmosis.gamm.v1beta1, file ./proto/cosmos/osmosis/gamm/v1beta1/tx.proto does not exist'
    );
  });
});
