// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { ApiOptions } from '@polkadot/api/types';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { delay } from '@subql/common';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import { buildDictionaryEntryMap, NodeConfig } from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';
import { BlockDispatcherService } from './worker/block-dispatcher.service';

const WS_ENDPOINT = 'wss://polkadot.api.onfinality.io/public-ws';
const HTTP_ENDPOINT = 'https://polkadot.api.onfinality.io/public';

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: WS_ENDPOINT,
    },
    chainTypes: {
      types: {
        TestType: 'u32',
      },
    },
    dataSources: [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            { handler: 'handleTest', kind: SubstrateHandlerKind.Event },
          ],
          file: '',
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

function testMultiDSSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: WS_ENDPOINT,
    },
    chainTypes: {
      types: {
        TestType: 'u32',
      },
    },
    dataSources: [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 100,
        mapping: {
          entryScript: '',
          handlers: [
            { handler: 'handleTest', kind: SubstrateHandlerKind.Event },
          ],
          file: '',
        },
      },
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 200,
        mapping: {
          entryScript: '',
          handlers: [
            { handler: 'handleTest', kind: SubstrateHandlerKind.Call },
          ],
          file: '',
        },
      },
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 300,
        mapping: {
          entryScript: '',
          handlers: [
            { handler: 'handleTest', kind: SubstrateHandlerKind.Event },
          ],
          file: '',
        },
      },
    ],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

function mockIndexerManager(): IndexerManager & {
  register: (handler: IndexerManager['indexBlock']) => void;
} {
  let _fn: any;

  return {
    register: (fn) => (_fn = fn),
    indexBlock: (block: BlockContent, runtimeVersion: RuntimeVersion) => {
      _fn?.(block, runtimeVersion);

      return Promise.resolve({ dynamicDsCreated: false });
    },
  } as any;
}

function mockProjectService(): ProjectService {
  return {
    blockOffset: 1,
    getProcessedBlockCount: jest.fn(() => Promise.resolve(0)),
    upsertMetadataBlockOffset: jest.fn(),
    setBlockOffset: jest.fn(),
  } as any;
}

jest.setTimeout(200000);
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: WS_ENDPOINT,
  dictionaryTimeout: 10,
  batchSize: 5,
});

async function createApp(
  project = testSubqueryProject(),
  indexerManager: IndexerManager,
): Promise<INestApplication> {
  const nestModule = await Test.createTestingModule({
    providers: [
      {
        provide: SubqueryProject,
        useFactory: () => project,
      },
      {
        provide: IndexerManager,
        useFactory: () => indexerManager,
      },
      {
        provide: NodeConfig,
        useFactory: () => nodeConfig,
      },
      {
        provide: Sequelize,
        useFactory: jest.fn(),
      },
      {
        provide: 'IBlockDispatcher',
        useFactory: (apiService, nodeConfig, eventEmitter, indexerManager) =>
          new BlockDispatcherService(
            apiService,
            nodeConfig,
            indexerManager,
            eventEmitter,
            mockProjectService(),
          ),
        inject: [ApiService, NodeConfig, EventEmitter2, IndexerManager],
      },
      ApiService,
      DsProcessorService,
      {
        provide: DynamicDsService,
        useFactory: (dsProcessorService, project) => {
          const dynamicDsService = new DynamicDsService(
            dsProcessorService,
            project,
          );
          (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);

          return dynamicDsService;
        },
        inject: [DsProcessorService, SubqueryProject],
      },
      {
        provide: DictionaryService,
        useFactory: () => new DictionaryService(project, nodeConfig),
      },
      SchedulerRegistry,
      UnfinalizedBlocksService,
      FetchService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = nestModule.createNestApplication();

  await app.init();
  await app.get(ApiService).init();

  return app;
}

describe('FetchService', () => {
  let app: INestApplication;
  let fetchService: FetchService;

  afterEach(async () => {
    fetchService?.onApplicationShutdown();
    app?.get('IBlockDispatcher').onApplicationShutdown();
    await delay(2);
    await app?.close();
  });

  it('fetch meta data once when spec version not changed in range', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();

    app = await createApp(project, indexerManager);

    fetchService = app.get(FetchService);
    const apiService = app.get(ApiService);
    const apiOptions = (apiService as any).apiOption as ApiOptions;
    const provider = apiOptions.provider;
    const getSendSpy = jest.spyOn(provider, 'send');

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 10) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(1);
    await pendingCondition;

    const getMetadataCalls = getSendSpy.mock.calls.filter(
      (call) => call[0] === 'state_getMetadata',
    );
    expect(getMetadataCalls.length).toBe(1);
  });

  it('fetch metadata two times when spec version changed in range', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();

    app = await createApp(project, indexerManager);

    fetchService = app.get(FetchService);
    const apiService = app.get(ApiService);
    const apiOptions = (apiService as any).apiOption as ApiOptions;
    const provider = apiOptions.provider;
    const getSendSpy = jest.spyOn(provider, 'send');

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    const getMetadataCalls = getSendSpy.mock.calls.filter(
      (call) => call[0] === 'state_getMetadata',
    );
    expect(getMetadataCalls.length).toBe(2);
  }, 100000);

  it('not use dictionary if dictionary is not defined in project config', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //filter is defined
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if filters not defined in datasource', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    // fetchService.onApplicationShutdown()
    // await delay(0.5)
  }, 500000);

  it('not use dictionary if block handler is defined in datasource', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleBlock',
              kind: SubstrateHandlerKind.Block,
            },
          ],
        },
      },
    ];
    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if one of the handler filter module or method is not defined', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
            //missing method will set useDictionary to false
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  // at init
  it('set useDictionary to false if dictionary metadata not match with the api', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to different network
    //set to a kusama network and use polkadot dictionary
    project.network.endpoint = 'wss://kusama.api.onfinality.io/public-ws';
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );

    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 29240) {
          resolve(undefined);
        }

        return {
          dynamicDsCreated: false,
          operationHash: null,
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    expect(dictionaryValidationSpy).toReturnWith(false);
    expect((fetchService as any).specVersionMap.length).toBe(0);
  }, 500000);

  it('use dictionary and specVersionMap to get block specVersion', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';

    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    await fetchService.init(1);
    const getSpecFromMapSpy = jest.spyOn(fetchService, 'getSpecFromMap');
    const specVersion = await fetchService.getSpecVersion(8638105);
    expect(getSpecFromMapSpy).toBeCalledTimes(1);
  }, 500000);

  it('use api to get block specVersion when blockHeight out of specVersionMap', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';

    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    await fetchService.init(1);
    const getSpecFromMapSpy = jest.spyOn(fetchService, 'getSpecFromMap');
    const getSpecFromApiSpy = jest.spyOn(fetchService, 'getSpecFromApi');

    // current last specVersion 9200, we should always use api for check next spec

    await expect(fetchService.getSpecVersion(90156860)).rejects.toThrow();
    // It checked with dictionary specVersionMap once, and fall back to use api method
    expect(getSpecFromMapSpy).toBeCalledTimes(1);
    // this large blockHeight should be thrown
    expect(getSpecFromApiSpy).toBeCalledTimes(1);
  }, 500000);

  it('only fetch SpecVersion from dictionary once', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';
    // make sure use dictionary is true
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    const dictionaryService = (fetchService as any).dictionaryService;
    const getSpecVersionSpy = jest.spyOn(dictionaryService, 'getSpecVersions');

    await fetchService.init(1);
    fetchService.onApplicationShutdown();

    await fetchService.getSpecVersion(8638105);
    await fetchService.getSpecVersion(8638200);

    expect(getSpecVersionSpy).toBeCalledTimes(1);
  }, 500000);

  it('update specVersionMap once when specVersion map is out', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);
    (fetchService as any).templateDynamicDatasouces = [];
    fetchService.updateDictionary();

    fetchService.onApplicationShutdown();

    (fetchService as any).latestFinalizedHeight = 10437859;
    //mock specVersion map
    (fetchService as any).specVersionMap = [
      { id: '9180', start: 9738718, end: 10156856 },
    ];
    const spec = await fetchService.getSpecVersion(10337859);
    const specVersionMap = (fetchService as any).specVersionMap;
    // If the last finalized block specVersion are same,  we expect it will update the specVersion map
    const latestSpecVersion =
      await fetchService.api.rpc.state.getRuntimeVersion();
    // This should be match if dictionary is fully synced
    expect(Number(specVersionMap[specVersionMap.length - 1].id)).toBe(
      latestSpecVersion.specVersion.toNumber(),
    );
  }, 500000);

  it('prefetch meta for different specVersion range', async () => {
    const project = testSubqueryProject();
    const indexerManager = mockIndexerManager();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubstrateDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          file: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubstrateHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];

    app = await createApp(project, indexerManager);
    fetchService = app.get(FetchService);

    await fetchService.init(1);
    fetchService.onApplicationShutdown();

    (fetchService as any).latestFinalizedHeight = 10437859;
    //mock specVersion map
    (fetchService as any).specVersionMap = [
      { id: '9140', start: 8115870, end: 8638103 },
      { id: '9151', start: 8638104, end: 9280180 },
      { id: '9170', start: 9280180, end: 9738717 },
      { id: '9180', start: 9738718, end: 10156856 },
      { id: '9190', start: 10156857, end: 10437859 },
    ];
    const getPrefechMetaSpy = jest.spyOn(SubstrateUtil, 'prefetchMetadata');
    (fetchService as any).parentSpecVersion = 9140;
    await fetchService.prefetchMeta(9738720); // in 9180
    // Should be called 91151,9170,9180
    expect(getPrefechMetaSpy).toBeCalledTimes(3);
  }, 500000);

  // Test if the built map is correct, the values of the arrays to be accumlative
  it('buildDictionaryQueryEntries', () => {
    const project = testMultiDSSubqueryProject();
    const templateDynamicDatasouces = [];
    const startHeight = project.dataSources[0].startBlock;
    const mappedQueryEntries = buildDictionaryEntryMap(
      project.dataSources,
      templateDynamicDatasouces,
      (fetchService as any).getDictionaryQueryEntries,
    );

    // expect(mappedQueryEntries).toBe()
    //
  });

  //test if getDictionary is using the correct mapped_value at certain heights
  /*
  e.g.

  mapping_keys =  100,200,300
  startBlock = 170
  endBlock is 201

  this should be using the dictQuery for mapping_keys 200
   */

  /*
 useDictionary should be disabled, if there is a blockHandler in future dataSource
 However, it should remain true prior to the block
  */
});
