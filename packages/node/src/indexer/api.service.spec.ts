// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, WsProvider } from '@polkadot/api';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { omit } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';

jest.mock('@polkadot/api', () => {
  const ApiPromise = jest.fn();
  (ApiPromise as any).create = jest.fn(() => ({
    on: jest.fn(),
    runtimeChain: jest.fn(),
    runtimeVersion: { specName: jest.fn() },
    genesisHash:
      '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    consts: jest.fn(),
    disconnect: jest.fn(),
  }));
  return { ApiPromise, WsProvider: jest.fn() };
});

const testNetwork = {
  endpoint: { 'ws://kusama.api.onfinality.io/public-ws': {} },
  types: {
    TestType: 'u32',
  },
  typesAlias: {
    Alias: { TestType2: 'test' },
  },
  typesBundle: {
    spec: {
      '2312': {
        types: [{ minmax: [232, 122], types: { TestType3: 'test3' } }],
      },
    },
    chain: {
      mockchain: {
        types: [{ minmax: [232, 122], types: { TestType4: 'test4' } }],
      },
    },
  },
  typesChain: { chain2: { TestType5: 'test' } },
  typesSpec: { spec3: { TestType6: 'test' } },
};

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: { 'https://polkadot.api.onfinality.io/public': {} },
  dictionaryTimeout: 10,
});

function testSubqueryProject(): SubqueryProject {
  return {
    id: 'test',
    root: './',
    network: {
      endpoint: testNetwork.endpoint,
      // genesisHash:
      //   '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
      chainId:
        '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    },
    dataSources: [],
    schema: new GraphQLSchema({}),
    templates: [],
    chainTypes: {
      types: testNetwork.types,
      typesAlias: testNetwork.typesAlias,
      typesBundle: testNetwork.typesBundle,
      typesChain: testNetwork.typesChain,
      typesSpec: testNetwork.typesSpec,
    },
  } as unknown as SubqueryProject;
}

describe('ApiService', () => {
  let project: SubqueryProject;
  let apiService: ApiService;

  beforeEach(() => {
    project = testSubqueryProject();
  });

  afterEach(async () => {
    // Disconnect apis
    await apiService?.onApplicationShutdown();
  });

  it('read custom types from project manifest', async () => {
    const createSpy = jest.spyOn(ApiPromise, 'create');
    apiService = new ApiService(
      project,
      new ConnectionPoolService<ApiPromiseConnection>(
        nodeConfig,
        new ConnectionPoolStateManager(),
      ),
      new EventEmitter2(),
      nodeConfig,
    );
    await apiService.init();
    const { version } = require('../../package.json');
    expect(WsProvider).toHaveBeenCalledWith(
      Object.keys(testNetwork.endpoint)[0],
      2500,
      {
        'User-Agent': `SubQuery-Node ${version}`,
      },
    );
    expect(createSpy).toHaveBeenCalledWith({
      provider: expect.anything(),
      throwOnConnect: expect.anything(),
      noInitWarn: true,
      ...omit(testNetwork, ['endpoint']),
    });
  });

  it('throws if expected genesis hash doesnt match', async () => {
    // Now after manifest 1.0.0, will use chainId instead of genesisHash
    (project.network as any).chainId = '0x';

    const nodeConfig: NodeConfig = new NodeConfig({
      batchSize: 1,
      subquery: 'example',
    });

    apiService = new ApiService(
      project,
      new ConnectionPoolService<ApiPromiseConnection>(
        nodeConfig,
        new ConnectionPoolStateManager(),
      ),
      new EventEmitter2(),
      nodeConfig,
    );

    await expect(apiService.init()).rejects.toThrow();
  });
});
