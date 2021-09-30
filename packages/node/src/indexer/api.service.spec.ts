// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ProjectNetworkV0_0_1 } from '@subql/common';
import { GraphQLSchema } from 'graphql';
import { omit } from 'lodash';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';

jest.mock('@polkadot/api', () => {
  const ApiPromise = jest.fn();
  (ApiPromise as any).create = jest.fn(() => ({
    on: jest.fn(),
    runtimeChain: jest.fn(),
    runtimeVersion: { specName: jest.fn() },
    genesisHash:
      '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    consts: jest.fn(),
  }));
  return { ApiPromise, WsProvider: jest.fn() };
});

const testNetwork: ProjectNetworkV0_0_1 = {
  endpoint: 'wss://kusama.api.onfinality.io/public-ws',
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

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: testNetwork.endpoint,
      genesisHash:
        '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    },
    chainTypes: {
      types: testNetwork.types,
      typesAlias: testNetwork.typesAlias,
      typesBundle: testNetwork.typesBundle,
      typesChain: testNetwork.typesChain,
      typesSpec: testNetwork.typesSpec,
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
  };
}

describe('ApiService', () => {
  it('read custom types from project manifest', async () => {
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    expect(WsProvider).toHaveBeenCalledWith(testNetwork.endpoint);
    expect(ApiPromise.create).toHaveBeenCalledWith({
      provider: expect.anything(),
      throwOnConnect: expect.anything(),
      ...omit(testNetwork, ['endpoint']),
    });
  });

  it('throws if expected genesis hash doesnt match', async () => {
    const project = testSubqueryProject();

    (project.network as any).genesisHash = '0x';

    const apiService = new ApiService(project, new EventEmitter2());

    await expect(apiService.init()).rejects.toThrow();
  });
});
