// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectManifestVersioned, SubqlKind } from '@subql/common';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { SubqueryFactory } from '../entities';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { PoiService } from './poi.service';
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

function testSubqueryProjectV0_0_1(): SubqueryProject {
  const project = new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.0.1',
      network: {
        endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
      },
      schema: './schema.graphql',
      dataSources: [
        {
          name: 'runtime0',
          kind: SubqlKind.Runtime,
          startBlock: 1,
          mapping: {
            handlers: [
              { handler: 'testSandbox', kind: SubqlKind.EventHandler },
            ],
          },
        },
        {
          name: 'runtime1',
          kind: SubqlKind.Runtime,
          startBlock: 1,
          mapping: {
            handlers: [
              { handler: 'testSandbox', kind: SubqlKind.EventHandler },
            ],
          },
        },
      ],
    } as any),
    path.resolve(__dirname, '../../test/sandbox'),
  );
  return project;
}

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.2.0',
      network: {
        genesisHash:
          '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      },
      schema: { file: './schema.graphql' },
      dataSources: [
        {
          name: 'runtime0',
          kind: SubqlKind.Runtime,
          startBlock: 1,
          mapping: {
            file: './main.js',
            handlers: [
              { handler: 'testSandbox', kind: SubqlKind.EventHandler },
            ],
          },
        },
        {
          name: 'runtime1',
          kind: SubqlKind.Runtime,
          startBlock: 1,
          mapping: {
            file: './main.js',
            handlers: [
              { handler: 'testSandbox', kind: SubqlKind.EventHandler },
            ],
          },
        },
      ],
    } as any),
    path.resolve(__dirname, '../../test/sandbox'),
    {
      endpoint: nodeConfig.networkEndpoint,
      dictionary: nodeConfig.networkDictionary,
    },
  );
  return project;
}

function createIndexerManager(project: SubqueryProject): IndexerManager {
  const sequilize = new Sequelize();
  const eventEmitter = new EventEmitter2();

  const apiService = new ApiService(project, eventEmitter);
  const dictionaryService = new DictionaryService(project);
  const fetchService = new FetchService(
    apiService,
    nodeConfig,
    project,
    dictionaryService,
    eventEmitter,
  );
  const poiService = new PoiService(project, sequilize);
  const storeService = new StoreService(sequilize, nodeConfig, poiService);
  const subqueryRepo = SubqueryFactory(sequilize);

  return new IndexerManager(
    apiService,
    storeService,
    fetchService,
    poiService,
    sequilize,
    project,
    nodeConfig,
    subqueryRepo,
    eventEmitter,
  );
}

describe('IndexerManager', () => {
  it('should be able to start the manager (v0.0.1)', async () => {
    const indexerManager = createIndexerManager(testSubqueryProjectV0_0_1());
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });

  it('should be able to start the manager (v0.2.0)', async () => {
    const indexerManager = createIndexerManager(testSubqueryProject());
    await expect(indexerManager.start()).resolves.toBe(undefined);

    expect(Object.keys((indexerManager as any).vms).length).toBe(1);
  });
});
