// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ApiOptions } from '@polkadot/api/types';
import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
} from '@subql/common-substrate';
import { GraphQLSchema } from 'graphql';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { delay } from '../utils/promise';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { FetchService } from './fetch.service';

function testSubqueryProject(): SubqueryProject {
  return {
    network: {
      endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
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

jest.setTimeout(200000);

async function createFetchService(
  project = testSubqueryProject(),
  batchSize = 5,
): Promise<FetchService> {
  const apiService = new ApiService(project, new EventEmitter2());
  const dsProcessorService = new DsProcessorService(project);
  const dynamicDsService = new DynamicDsService(dsProcessorService, project);
  (dynamicDsService as any).getDynamicDatasources = jest.fn(() => []);
  await apiService.init();
  const dictionaryService = new DictionaryService(project);
  const dsPluginService = new DsProcessorService(project);
  return new FetchService(
    apiService,
    new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
    project,
    dictionaryService,
    dsPluginService,
    dynamicDsService,
    new EventEmitter2(),
    new SchedulerRegistry(),
  );
}

describe('FetchService', () => {
  let fetchService: FetchService;

  afterEach(async () => {
    await delay(0.5);
    (fetchService as unknown as any)?.apiService?.onApplicationShutdown();
    fetchService.onApplicationShutdown();
  });

  it('fetch meta data once when spec version not changed in range', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();

    fetchService = await createFetchService(project, batchSize);

    const apiService = (fetchService as any).apiService as ApiService;
    const apiOptions = (apiService as any).apiOption as ApiOptions;
    const provider = apiOptions.provider;
    const getSendSpy = jest.spyOn(provider, 'send');
    await fetchService.init();
    const loopPromise = fetchService.startLoop(1);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 10) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    const getMetadataCalls = getSendSpy.mock.calls.filter(
      (call) => call[0] === 'state_getMetadata',
    );
    expect(getMetadataCalls.length).toBe(1);
    // fetchService.onApplicationShutdown()
    // await delay(0.5)
  });

  it('fetch metadata two times when spec version changed in range', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();

    fetchService = await createFetchService(project, batchSize);

    const apiService = (fetchService as any).apiService as ApiService;
    const apiOptions = (apiService as any).apiOption as ApiOptions;
    const provider = apiOptions.provider;
    const getSendSpy = jest.spyOn(provider, 'send');

    await fetchService.init();
    //29150
    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    const getMetadataCalls = getSendSpy.mock.calls.filter(
      (call) => call[0] === 'state_getMetadata',
    );
    expect(getMetadataCalls.length).toBe(2);
    // fetchService.onApplicationShutdown()
    // await delay(0.5)
  }, 100000);

  it('not use dictionary if dictionary is not defined in project config', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();
    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    // fetchService.onApplicationShutdown()
    // await delay(0.5)
  }, 500000);

  it('not use dictionary if filters not defined in datasource', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';

    fetchService = await createFetchService(project, batchSize);
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();
    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    // fetchService.onApplicationShutdown()
    // await delay(0.5)
  }, 500000);

  it('not use dictionary if block handler is defined in datasource', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
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
    fetchService = await createFetchService(project, batchSize);
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();
    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if one of the handler filter module or method is not defined', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);
    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();
    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  // at init
  it('set useDictionary to false if dictionary metadata not match with the api', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);

    const nextEndBlockHeightSpy = jest.spyOn(
      fetchService as any,
      `nextEndBlockHeight`,
    );
    const dictionaryValidationSpy = jest.spyOn(
      fetchService as any,
      `dictionaryValidation`,
    );
    await fetchService.init();

    const loopPromise = fetchService.startLoop(29230);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
    expect(dictionaryValidationSpy).toReturnWith(false);
    expect((fetchService as any).specVersionMap.length).toBe(0);
  }, 500000);

  it('use dictionary and specVersionMap to get block specVersion', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';

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

    fetchService = await createFetchService(project, batchSize);
    await fetchService.init();
    const getSpecFromMapSpy = jest.spyOn(fetchService, 'getSpecFromMap');
    const specVersion = await fetchService.getSpecVersion(8638105);
    expect(getSpecFromMapSpy).toBeCalledTimes(1);
  }, 500000);

  it('use api to get block specVersion when blockHeight out of specVersionMap', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/polkadot-dictionary';

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

    fetchService = await createFetchService(project, batchSize);
    await fetchService.init();
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
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);
    const dictionaryService = (fetchService as any).dictionaryService;
    const getSpecVersionSpy = jest.spyOn(dictionaryService, 'getSpecVersions');

    await fetchService.init();

    await fetchService.getSpecVersion(8638105);
    await fetchService.getSpecVersion(8638200);

    expect(getSpecVersionSpy).toBeCalledTimes(1);
  }, 500000);

  it('update specVersionMap once when specVersion map is out', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);
    await fetchService.init();

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
    const batchSize = 5;
    const project = testSubqueryProject();
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

    fetchService = await createFetchService(project, batchSize);
    await fetchService.init();

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
});
