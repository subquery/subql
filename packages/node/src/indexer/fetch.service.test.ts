// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectManifestVersioned, SubqlKind } from '@subql/common';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { FetchService } from './fetch.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject(
    new ProjectManifestVersioned({
      specVersion: '0.0.1',
      network: {
        endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
        types: {
          TestType: 'u32',
        },
      },
      dataSources: [
        {
          name: 'runtime',
          kind: SubqlKind.Runtime,
          startBlock: 1,
          mapping: {
            handlers: [{ handler: 'handleTest', kind: SubqlKind.EventHandler }],
          },
        },
      ],
    } as any),
    '',
    {},
  );
  return project;
}

jest.setTimeout(200000);

describe('FetchService', () => {
  it('fetch meta data once when spec version not changed in range', async () => {
    const batchSize = 30;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    const dictionaryService = new DictionaryService(project);
    await apiService.init();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    const api = apiService.getApi();
    const getMetaSpy = jest.spyOn(
      (api as any)._rpcCore.state.getMetadata,
      'raw',
    );

    await fetchService.init();
    const loopPromise = fetchService.startLoop(1);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 10) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(getMetaSpy).toBeCalledTimes(1);
  });

  it('fetch metadata two times when spec version changed in range', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
    const api = apiService.getApi();
    const getMetaSpy = jest.spyOn(
      (api as any)._rpcCore.state.getMetadata,
      'raw',
    );

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
    expect(getMetaSpy).toBeCalledTimes(2);
  }, 100000);

  it('not use dictionary if dictionary is not defined in project config', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    //filter is defined
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleEvent',
              kind: 'substrate/EventHandler',
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
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
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if filters not defined in datasource', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
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
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if block handler is defined in datasource', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleBlock',
              kind: 'substrate/BlockHandler',
            },
          ],
        },
      },
    ];
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
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
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('not use dictionary if one of the handler filter module or method is not defined', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    //set dictionary to a different network
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleEvent',
              kind: 'substrate/EventHandler',
              filter: { module: 'staking', method: 'Reward' },
            },
            //missing method will set useDictionary to false
            {
              handler: 'handleEvent',
              kind: 'substrate/EventHandler',
              filter: { module: 'staking' },
            },
          ],
        },
      },
    ];

    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
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
    expect(dictionaryValidationSpy).not.toBeCalled();
    expect(nextEndBlockHeightSpy).toBeCalled();
  }, 500000);

  it('set useDictionary to false if dictionary metadata not match with the api', async () => {
    const batchSize = 20;
    const project = testSubqueryProject();
    //set dictionary to different network
    //set to a kusama network and use polkadot dictionary
    project.network.endpoint = 'wss://kusama.api.onfinality.io/public-ws';
    project.network.dictionary =
      'https://api.subquery.network/sq/subquery/dictionary-polkadot';
    project.projectManifest.asV0_0_1.dataSources = [
      {
        name: 'runtime',
        kind: SubqlKind.Runtime,
        startBlock: 1,
        mapping: {
          handlers: [
            {
              handler: 'handleEvent',
              kind: 'substrate/EventHandler',
              filter: { module: 'staking', method: 'Reward' },
            },
          ],
        },
      },
    ];
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService(project);
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      project,
      dictionaryService,
      new EventEmitter2(),
    );
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
  }, 500000);
});
