// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiOptions } from '@polkadot/api/types';
import { ApiService } from '@subql/common-node';
import { SubstrateApiService } from '@subql/node-substrate';
import {
  BlockWrapper,
  SubqlDatasourceKind,
  SubqlHandlerKind,
  SubstrateBlock,
} from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/SubqueryProject';
import { DictionaryService } from './dictionary.service';
import { DsProcessorService } from './ds-processor.service';
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
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [{ handler: 'handleTest', kind: SubqlHandlerKind.Event }],
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
  const apiService = new SubstrateApiService(project, new EventEmitter2());
  await apiService.init();
  const dictionaryService = new DictionaryService(project);
  const dsPluginService = new DsProcessorService(project);
  return new FetchService(
    apiService,
    new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
    project,
    dictionaryService,
    dsPluginService,
    new EventEmitter2(),
  );
}

describe('FetchService', () => {
  let fetchService: FetchService;

  afterEach(() => {
    return (
      fetchService as unknown as any
    )?.apiService?.onApplicationShutdown();
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      if (content.block.block.header.number.toNumber() === 10) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    const getMetadataCalls = getSendSpy.mock.calls.filter(
      (call) => call[0] === 'state_getMetadata',
    );
    expect(getMetadataCalls.length).toBe(1);
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
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
  }, 100000);

  it('not use dictionary if dictionary is not defined in project config', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //filter is defined
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubqlHandlerKind.Event,
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
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
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            {
              handler: 'handleBlock',
              kind: SubqlHandlerKind.Block,
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if one of the handler filter module or method is not defined', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubqlHandlerKind.Event,
              filter: { module: 'staking', method: 'Reward' },
            },
            //missing method will set useDictionary to false
            {
              handler: 'handleEvent',
              kind: SubqlHandlerKind.Event,
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      //29250
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('set useDictionary to false if dictionary metadata not match with the api', async () => {
    const batchSize = 5;
    const project = testSubqueryProject();
    //set dictionary to different network
    //set to a kusama network and use polkadot dictionary
    project.network.endpoint = 'wss://kusama.api.onfinality.io/public-ws';
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.dataSources = [
      {
        name: 'runtime',
        kind: SubqlDatasourceKind.Runtime,
        startBlock: 1,
        mapping: {
          entryScript: '',
          handlers: [
            {
              handler: 'handleEvent',
              kind: SubqlHandlerKind.Event,
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
    fetchService.register(async (content: BlockWrapper<SubstrateBlock>) => {
      if (content.block.block.header.number.toNumber() === 29240) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(dictionaryValidationSpy).toBeCalledTimes(1);
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);
});
