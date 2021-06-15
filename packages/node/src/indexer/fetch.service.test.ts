// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';
import { DictionaryService } from './dictionary.service';
import { FetchService } from './fetch.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    // endpoint: `wss://node-6790848002104033280.lh.onfinality.io/ws?apikey=23c0a554-a3fa-4501-b9e3-3c278ef9b2cb`,
    types: {
      TestType: 'u32',
    },
  };
  project.dataSources = [];
  return project;
}

jest.setTimeout(200000);

describe('FetchService', () => {
  it('fetch meta data once when spec version not changed in range', async () => {
    const batchSize = 30;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    const dictionaryService = new DictionaryService();
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

  it('fetch meta data twice when spec version changed in range', async () => {
    const batchSize = 10;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const dictionaryService = new DictionaryService();
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
  });
});
