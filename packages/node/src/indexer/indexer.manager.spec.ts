// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubqlDatasourceKind, SubqlHandlerKind } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryFactory } from '../entities';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { SandboxService } from './sandbox.service';
import { StoreService } from './store.service';

jest.mock('sequelize', () => {
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
  const actualSequelize = jest.requireActual('sequelize');
  return {
    Sequelize: jest.fn(() => mSequelize),
    DataTypes: actualSequelize.DataTypes,
    QueryTypes: actualSequelize.QueryTypes,
  };
});

jest.setTimeout(200000);

const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: 'wss://polkadot.api.onfinality.io/public-ws',
});

function testSubqueryProject_1(): SubqueryProject {
  return {
    network: {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    },
    dataSources: [
      {
        name: 'runtime0',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [{ handler: 'testSandbox', kind: SubqlHandlerKind.Event }],
        },
      },
      {
        name: 'runtime1',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [{ handler: 'testSandbox', kind: SubqlHandlerKind.Event }],
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
  };
}

function testSubqueryProject_2(): SubqueryProject {
  return {
    network: {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
      genesisHash:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    },
    dataSources: [
      {
        name: 'runtime0',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: `console.log('test handler runtime0')`,
          handlers: [{ handler: 'testSandbox', kind: SubqlHandlerKind.Event }],
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
  };
}

function createIndexerManager(project: SubqueryProject): IndexerManager {
  const sequilize = new Sequelize();
  const eventEmitter = new EventEmitter2();

  const apiService = new ApiService(project, eventEmitter);
  const dictionaryService = new DictionaryService(project);

  const dsPluginService = new DsProcessorService(project);
  const fetchService = new FetchService(
    apiService,
    nodeConfig,
    project,
    dictionaryService,
    dsPluginService,
    eventEmitter,
  );
  const poiService = new PoiService(nodeConfig, project, sequilize);
  const storeService = new StoreService(sequilize, nodeConfig, poiService);
  const subqueryRepo = SubqueryFactory(sequilize);
  const mmrService = new MmrService(nodeConfig, project, sequilize);
  const sandboxService = new SandboxService(
    apiService,
    storeService,
    nodeConfig,
    project,
  );

  return new IndexerManager(
    storeService,
    apiService,
    fetchService,
    poiService,
    mmrService,
    sequilize,
    project,
    nodeConfig,
    sandboxService,
    dsPluginService,
    subqueryRepo,
    eventEmitter,
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

  xit('should be able to start the manager (v0.0.1)', async () => {
    indexerManager = createIndexerManager(testSubqueryProject_1());
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });

  xit('should be able to start the manager (v0.2.0)', async () => {
    indexerManager = createIndexerManager(testSubqueryProject_2());
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });
});
