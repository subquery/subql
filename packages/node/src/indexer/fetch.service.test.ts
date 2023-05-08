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
import {
  MmrService,
  NodeConfig,
  PoiService,
  StoreService,
  SmartBatchService,
  StoreCacheService,
  ConnectionPoolService,
} from '@subql/node-core';
import { GraphQLSchema } from 'graphql';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { ApiPromiseConnection } from './apiPromise.connection';
import { BlockDispatcherService } from './blockDispatcher';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';
import { IndexerManager } from './indexer.manager';
import { ProjectService } from './project.service';
import { RuntimeService } from './runtime/runtimeService';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const WS_ENDPOINT = 'wss://polkadot.api.onfinality.io/public-ws';
const HTTP_ENDPOINT = 'https://polkadot.api.onfinality.io/public';

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      chainId:
        '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      endpoint: [WS_ENDPOINT],
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
    getAllDataSources: jest.fn(),
  } as any;
}

jest.setTimeout(200000);
const nodeConfig = new NodeConfig({
  subquery: 'asdf',
  subqueryName: 'asdf',
  networkEndpoint: [WS_ENDPOINT],
  dictionaryTimeout: 10,
  batchSize: 5,
  storeCacheAsync: false,
});

async function createApp(
  project = testSubqueryProject(),
  indexerManager: IndexerManager,
): Promise<INestApplication> {
  const nestModule = await Test.createTestingModule({
    providers: [
      ConnectionPoolService,
      {
        provide: 'ISubqueryProject',
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
        provide: PoiService,
        useFactory: jest.fn(),
      },
      {
        provide: MmrService,
        useFactory: jest.fn(),
      },
      {
        provide: StoreService,
        useFactory: jest.fn(() => ({
          setOperationStack: jest.fn(),
          getOperationMerkleRoot: jest.fn(),
          setBlockHeight: jest.fn(),
        })),
      },
      {
        provide: StoreCacheService,
        useFactory: jest.fn(() => ({
          metadata: {
            find: jest.fn(() => Promise.resolve(undefined)),
            setBulk: jest.fn(),
            setIncrement: jest.fn(),
          },
          flushCache: jest.fn(),
        })),
      },
      {
        provide: Sequelize,
        useFactory: jest.fn(),
      },
      {
        provide: 'IBlockDispatcher',
        useFactory: (
          apiService,
          nodeConfig,
          eventEmitter,
          indexerManager,
          storeService,
          storeCahceService,
          poiService,
          dynamicDsService,
        ) =>
          new BlockDispatcherService(
            apiService,
            nodeConfig,
            indexerManager,
            eventEmitter,
            mockProjectService(),
            new SmartBatchService(nodeConfig.batchSize),
            storeService,
            storeCahceService,
            poiService,
            project,
            dynamicDsService,
          ),
        inject: [
          ApiService,
          NodeConfig,
          EventEmitter2,
          IndexerManager,
          StoreService,
          StoreCacheService,
          PoiService,
          DynamicDsService,
        ],
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
        inject: [DsProcessorService, 'ISubqueryProject'],
      },
      ProjectService,
      {
        provide: DictionaryService,
        useFactory: async () => {
          const dictionaryService = new DictionaryService(project, nodeConfig);
          await dictionaryService.init();
          return dictionaryService;
        },
      },
      SchedulerRegistry,
      UnfinalizedBlocksService,
      FetchService,
      RuntimeService,
    ],
    imports: [EventEmitterModule.forRoot()],
  }).compile();

  const app = nestModule.createNestApplication();

  await app.init();
  await app.get(ApiService).init();
  await app.get(UnfinalizedBlocksService).init(() => Promise.resolve());

  return app;
}

describe('FetchService', () => {
  let app: INestApplication;
  let fetchService: FetchService;
  let runtimeService: RuntimeService;

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
    runtimeService = (fetchService as any).runtimeService;
    const apiService = app.get(ApiService);
    const connectionPoolService = (apiService as any)
      .connectionPoolService as ConnectionPoolService<ApiPromiseConnection>;
    const firstApiConnection = (connectionPoolService as any).allApi[0];

    const apiOptions = (firstApiConnection as any)._api._options as ApiOptions;
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
          blockHash: content.block.block.header.hash.toHex(),
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
    const connectionPoolService = (apiService as any)
      .connectionPoolService as ConnectionPoolService<ApiPromiseConnection>;
    const firstApiConnection = (connectionPoolService as any).allApi[0];

    const apiOptions = (firstApiConnection as any)._api._options as ApiOptions;
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
          blockHash: content.block.block.header.hash.toHex(),
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
          blockHash: content.block.block.header.hash.toHex(),
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;
    // This is no longer to be called, as it check whether dictionary is provided or not.
    expect(dictionaryValidationSpy).toBeCalledTimes(0);
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
          blockHash: content.block.block.header.hash.toHex(),
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
          blockHash: content.block.block.header.hash.toHex(),
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
          blockHash: content.block.block.header.hash.toHex(),
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
    project.network.chainId =
      '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe';
    project.network.endpoint = ['wss://kusama.api.onfinality.io/public-ws'];
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
          blockHash: content.block.block.header.hash.toHex(),
          reindexBlockHeight: null,
        };
      });
    });

    await fetchService.init(29230);
    await pendingCondition;

    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    expect(dictionaryValidationSpy).toReturnWith(Promise.resolve(false));
    expect((fetchService as any).runtimeService.specVersionMap.length).toBe(0);
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
    runtimeService = (fetchService as any).runtimeService;

    await fetchService.init(1);
    const getSpecFromMapSpy = jest.spyOn(runtimeService, 'getSpecFromMap');
    await runtimeService.getSpecVersion(8638105);
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
    runtimeService = (fetchService as any).runtimeService;

    const getSpecFromMapSpy = jest.spyOn(runtimeService, 'getSpecFromMap');
    const getSpecFromApiSpy = jest.spyOn(runtimeService, 'getSpecFromApi');

    // current last specVersion 9200, we should always use api for check next spec

    await expect(runtimeService.getSpecVersion(90156860)).rejects.toThrow();
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
    runtimeService = (fetchService as any).runtimeService;

    const dictionaryService = (fetchService as any).dictionaryService;
    const getSpecVersionRawSpy = jest.spyOn(
      dictionaryService,
      'getSpecVersionsRaw',
    );

    await fetchService.init(1);
    fetchService.onApplicationShutdown();

    await runtimeService.getSpecVersion(8638105);
    await runtimeService.getSpecVersion(8638200);

    expect(getSpecVersionRawSpy).toBeCalledTimes(1);
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
    runtimeService = app.get(RuntimeService);
    (runtimeService as any).useDictionary = true;

    // Update dictionary is now private
    (fetchService as any).updateDictionary();
    await fetchService.init(1);
    fetchService.onApplicationShutdown();

    (fetchService as any)._latestFinalizedHeight = 10437859;
    //mock specVersion map
    // (runtimeService as any).specVersionMap = [
    //   { id: '9180', start: 9738718, end: 10156856 },
    // ];
    await runtimeService.getSpecVersion(10337859);
    const specVersionMap = (runtimeService as any).specVersionMap;
    // If the last finalized block specVersion are same,  we expect it will update the specVersion map
    const latestSpecVersion =
      await fetchService.api.rpc.state.getRuntimeVersion();
    // This should be match if dictionary is fully synced
    expect(Number(specVersionMap[specVersionMap.length - 1].id)).toBe(
      latestSpecVersion.specVersion.toNumber(),
    );
  }, 500000);

  // Skip for now, test timeout
  it.skip('prefetch meta for different specVersion range', async () => {
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
    runtimeService = (fetchService as any).runtimeService;

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
    await runtimeService.prefetchMeta(9738720); // in 9180
    // Should be called 9151,9170,9180
    expect(getPrefechMetaSpy).toBeCalledTimes(3);
  }, 500000);

  // We skip this test, as process will exit. Test might not work once failed block on the endpoint is fixed
  // When it exits, and with error `Failed to fetch blocks from queue Error: fetched block header hash ... is not match ...`
  // issued block example: https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fkarura-rpc-0.aca-api.network#/explorer/query/3467086
  it.skip('throw error if fetched block failed substrate block validation', async () => {
    const project = testSubqueryProject();

    project.dataSources[0].startBlock = 3467085;
    project.network.endpoint = ['wss://karura-rpc-0.aca-api.network'];

    const indexerManager = mockIndexerManager();

    app = await createApp(project, indexerManager);

    fetchService = app.get(FetchService);
    await fetchService.init(3467085);
    const pendingCondition = new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/require-await
      indexerManager.register(async (content) => {
        if (content.block.block.header.number.toNumber() === 3467095) {
          resolve(undefined);
        }
        return {
          dynamicDsCreated: false,
          blockHash: content.block.block.header.hash.toHex(),
          reindexBlockHeight: null,
        };
      });
    });
    await pendingCondition;
  }, 100000);
});
