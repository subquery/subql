// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import { toHex } from '@cosmjs/encoding';
import { Uint53 } from '@cosmjs/math';
import { toRfc3339WithNanoseconds } from '@cosmjs/tendermint-rpc';
import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { loadFromJsonOrYaml } from '@subql/common';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';

const ENDPOINT = 'https://rpc-juno.itastakers.com/';
const CHAINID = 'juno-1';

const TEST_BLOCKNUMBER = 3266772;

const ENDPOINT_CHIHUAHUA = 'https://chihuahua-rpc.publicnode.com:443';
const CHAINID_CHIHUAHUA = 'chihuahua-1';
const TEST_CHIHUAHUA = 10925390;

const projectsDir = path.join(__dirname, '../../test');

function testCosmosProject(
  endpoint = ENDPOINT,
  chainID = CHAINID,
): SubqueryProject {
  return {
    network: {
      endpoint: [endpoint],
      chainId: chainID,
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  } as SubqueryProject;
}

jest.setTimeout(200000);

describe.skip('ApiService', () => {
  let app: INestApplication;
  let apiService: ApiService;
  const prepareApiService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConnectionPoolStateManager,
        ConnectionPoolService,
        {
          provide: 'ISubqueryProject',
          useFactory: () => testCosmosProject(),
        },
        {
          provide: NodeConfig,
          useFactory: () => ({}),
        },
        EventEmitter2,
        ApiService,
        NodeConfig,
      ],
      imports: [EventEmitterModule.forRoot()],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    apiService = app.get(ApiService);
    await apiService.init();
  };

  beforeAll(async () => {
    await prepareApiService();
  });

  it('query block info', async () => {
    const api = apiService.api;
    const blockInfo = await api.blockInfo(TEST_BLOCKNUMBER);
    const doc: any = loadFromJsonOrYaml(
      path.join(projectsDir, 'block_3266772.json'),
    );
    const realBlockInfo = {
      id: toHex(doc.block_id.hash).toUpperCase(),
      header: {
        version: {
          block: new Uint53(+doc.block.header.version.block).toString(),
          app: blockInfo.block.header.version.app,
        },
        height: doc.block.header.height,
        chainId: doc.block.header.chainId,
        time: toRfc3339WithNanoseconds(doc.block.header.time),
      },
      txs: doc.block.txs,
    };
    expect(blockInfo).toMatchObject(realBlockInfo);
  });

  it('query tx info by height', async () => {
    const api = apiService.api;
    const txInfos = await api.txInfoByHeight(TEST_BLOCKNUMBER);
    expect(txInfos.length).toEqual(4);
  });
});

describe('ApiService Chihuahua', () => {
  let app: INestApplication;
  let apiService: ApiService;
  const prepareApiService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConnectionPoolStateManager,
        ConnectionPoolService,
        {
          provide: 'ISubqueryProject',
          useFactory: () =>
            testCosmosProject(ENDPOINT_CHIHUAHUA, CHAINID_CHIHUAHUA),
        },
        {
          provide: NodeConfig,
          useFactory: () => ({}),
        },
        EventEmitter2,
        ApiService,
        NodeConfig,
      ],
      imports: [EventEmitterModule.forRoot()],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    apiService = app.get(ApiService);
    await apiService.init();
  };

  beforeAll(async () => {
    await prepareApiService();
  });

  // This is to test https://github.com/cosmos/cosmjs/issues/1543
  it('chihuahua test, can query block result', async () => {
    const api = apiService.api;
    const blockInfo = await api.blockInfo(TEST_CHIHUAHUA);
    const blockResult = await api.blockResults(TEST_CHIHUAHUA);
    expect(blockResult).toBeTruthy();
  });
});
