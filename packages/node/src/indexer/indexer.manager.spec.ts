// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import {
  StoreService,
  PoiService,
  NodeConfig,
  ConnectionPoolService,
  StoreCacheService,
  ConnectionPoolStateManager,
  IProjectUpgradeService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

jest.mock('@subql/x-sequelize', () => {
  const mSequelize = {
    authenticate: jest.fn(),
    define: () => ({
      findOne: jest.fn(),
      create: (input: any) => input,
    }),
    query: () => [{ nextval: 1 }],
    showAllSchemas: () => ['subquery_1'],
    model: () => ({ upsert: jest.fn() }),
    sync: jest.fn(),
    transaction: () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
      afterCommit: jest.fn(),
    }),
    // createSchema: jest.fn(),
  };
  const actualSequelize = jest.requireActual('@subql/x-sequelize');
  return {
    ...actualSequelize,
    Sequelize: jest.fn(() => mSequelize),
  };
});

jest.setTimeout(200000);

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
});

function testSubqueryProject_1(): SubqueryProject {
  return new SubqueryProject(
    'test',
    './',
    {
      chainId: '0x',
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
    },
    [
      {
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          file: '',
          entryScript: '',
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
      {
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
    ],
    new GraphQLSchema({}),
    [],
  );
}

function testSubqueryProject_2(): SubqueryProject {
  return new SubqueryProject(
    'test',
    './',
    {
      endpoint: ['wss://polkadot.api.onfinality.io/public-ws'],
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
      chainId:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    },
    [
      {
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          file: '',
          entryScript: `console.log('test handler runtime0')`,
          handlers: [
            { handler: 'testSandbox', kind: SubstrateHandlerKind.Event },
          ],
        },
      },
    ],
    new GraphQLSchema({}),
    [],
  );
}

// eslint-disable-next-line jest/no-export
export function mockProjectUpgradeService(
  project: SubqueryProject,
): IProjectUpgradeService<SubqueryProject> {
  const startBlock = Math.min(
    ...project.dataSources.map((ds) => ds.startBlock),
  );

  let currentHeight = startBlock;
  return {
    init: jest.fn(),
    updateIndexedDeployments: jest.fn(),
    currentHeight: currentHeight,
    // eslint-disable-next-line @typescript-eslint/require-await
    setCurrentHeight: async (height: number) => {
      currentHeight = height;
    },
    currentProject: project,
    projects: new Map([[startBlock, project]]),
    getProject: () => project,
  };
}

function createIndexerManager(
  project: SubqueryProject,
  connectionPoolService: ConnectionPoolService<ApiPromiseConnection>,
  nodeConfig: NodeConfig,
): IndexerManager {
  const sequelize = new Sequelize();
  const eventEmitter = new EventEmitter2();
  const apiService = new ApiService(
    project,
    connectionPoolService,
    eventEmitter,
    nodeConfig,
  );
  const dsProcessorService = new DsProcessorService(project, nodeConfig);
  const dynamicDsService = new DynamicDsService(dsProcessorService, project);

  const storeCache = new StoreCacheService(sequelize, nodeConfig, eventEmitter);
  const storeService = new StoreService(
    sequelize,
    nodeConfig,
    storeCache,
    project,
  );
  const poiService = new PoiService(
    nodeConfig,
    storeCache,
    eventEmitter,
    project,
  );
  const unfinalizedBlocksService = new UnfinalizedBlocksService(
    apiService,
    nodeConfig,
    storeCache,
  );
  const sandboxService = new SandboxService(
    apiService,
    storeService,
    nodeConfig,
    project,
  );

  const projectUpgradeService = mockProjectUpgradeService(project);
  const projectService = new ProjectService(
    dsProcessorService,
    apiService,
    poiService,
    sequelize,
    project,
    projectUpgradeService,
    storeService,
    nodeConfig,
    dynamicDsService,
    eventEmitter,
    unfinalizedBlocksService,
  );

  return new IndexerManager(
    apiService,
    nodeConfig,
    sandboxService,
    dsProcessorService,
    dynamicDsService,
    unfinalizedBlocksService,
    projectService,
  );
}

/*
 * These tests aren't run because of setup requirements with such a large number of dependencies
 */
describe('IndexerManager', () => {
  let indexerManager: IndexerManager;

  afterEach(() => {
    (indexerManager as any)?.fetchService.onApplicationShutdown();
  });

  it.skip('should be able to start the manager (v0.0.1)', async () => {
    indexerManager = createIndexerManager(
      testSubqueryProject_1(),
      new ConnectionPoolService<ApiPromiseConnection>(
        nodeConfig,
        new ConnectionPoolStateManager(),
      ),
      nodeConfig,
    );
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });

  it.skip('should be able to start the manager (v0.2.0)', async () => {
    indexerManager = createIndexerManager(
      testSubqueryProject_2(),
      new ConnectionPoolService<ApiPromiseConnection>(
        nodeConfig,
        new ConnectionPoolStateManager(),
      ),
      nodeConfig,
    );
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });
});
