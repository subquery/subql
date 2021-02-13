// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';
import { FetchService } from './fetch.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    types: {
      TestType: 'u32',
    },
  };
  return project;
}

jest.setTimeout(100000);

describe('FetchService', () => {
  it('fetch meta data once when spec version not changed in range', async () => {
    const batchSize = 100;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      new EventEmitter2(),
    );
    const api = apiService.getApi();
    const getMetaSpy = jest.spyOn((api as any)._rpcCore.state, 'getMetadata');

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
    const batchSize = 100;
    const project = testSubqueryProject();
    const apiService = new ApiService(project, new EventEmitter2());
    await apiService.init();
    const fetchService = new FetchService(
      apiService,
      new NodeConfig({ subquery: '', subqueryName: '', batchSize }),
      new EventEmitter2(),
    );
    const api = apiService.getApi();
    const getMetaSpy = jest.spyOn((api as any)._rpcCore.state, 'getMetadata');

    await fetchService.init();
    const loopPromise = fetchService.startLoop(29150);
    // eslint-disable-next-line @typescript-eslint/require-await
    fetchService.register(async (content) => {
      if (content.block.block.header.number.toNumber() === 29250) {
        fetchService.onApplicationShutdown();
      }
    });
    await loopPromise;
    expect(getMetaSpy).toBeCalledTimes(2);
  });
});
