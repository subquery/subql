// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
  ProjectUpgradeService,
} from '@subql/node-core';
import { SubstrateDatasourceKind, SubstrateHandlerKind } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';

const nodeConfig = new NodeConfig({
  subquery: 'test',
  subqueryName: 'test',
  networkEndpoint: ['https://polkadot.api.onfinality.io/public'],
  dictionaryTimeout: 10,
});

function testSubqueryProject(): SubqueryProject {
  return {
    id: 'test',
    root: './',
    network: {
      endpoint: ['https://polkadot.api.onfinality.io/public'],
      chainId:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    },
    dataSources: [
      {
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
    ],
    schema: new GraphQLSchema({}),
    templates: [],
    chainTypes: {
      types: {
        TestType: 'u32',
      },
    },
    applyCronTimestamps: () => jest.fn(),
  } as unknown as SubqueryProject;
}

const demoProjects = [
  testSubqueryProject(),
  {
    parent: {
      utilBlock: 5,
      reference: '0',
    },
    ...testSubqueryProject(),
  },
] as SubqueryProject[];

jest.setTimeout(10_000);

describe('ProjectService', () => {
  let service: ProjectService;

  const apiService = new ApiService(
    demoProjects[0],
    new ConnectionPoolService<ApiPromiseConnection>(
      nodeConfig,
      new ConnectionPoolStateManager(),
    ),
    new EventEmitter2(),
    nodeConfig,
  );

  beforeEach(async () => {
    // Api service init at bootstrap
    await apiService.init();

    const projectUpgradeService = await ProjectUpgradeService.create(
      demoProjects[0],
      (id) => Promise.resolve(demoProjects[parseInt(id, 10)]),
      1,
    );

    (projectUpgradeService as any).init = jest.fn();
    (projectUpgradeService as any).updateIndexedDeployments = jest.fn();

    service = new ProjectService(
      {
        validateProjectCustomDatasources: jest.fn(),
      } as unknown as DsProcessorService,
      apiService,
      null as unknown as any,
      null as unknown as any,
      { query: jest.fn() } as unknown as any,
      demoProjects[0],
      projectUpgradeService,
      {
        initCoreTables: jest.fn(),
        storeCache: { metadata: {}, flushCache: jest.fn() },
      } as unknown as any,
      { unsafe: false } as unknown as NodeConfig,
      {
        getDynamicDatasources: jest.fn().mockResolvedValue([]),
        init: jest.fn(),
      } as unknown as DynamicDsService,
      null as unknown as any,
      null as unknown as any,
    );

    // Mock db related returns
    (service as any).ensureProject = jest.fn().mockResolvedValue('mock-schema');
    (service as any).ensureMetadata = jest.fn();
    (service as any).initDbSchema = jest.fn();
    (service as any).initUnfinalizedInternal = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  it('reload chainTypes when project changed, on init', async () => {
    const spyOnApiReloadChainTypes = jest.spyOn(apiService, 'reloadChainTypes');
    // mock last processed height
    (service as any).getLastProcessedHeight = jest.fn().mockResolvedValue(4);

    await service.init(5);

    expect(spyOnApiReloadChainTypes).toHaveBeenCalledTimes(1);
  });
});
