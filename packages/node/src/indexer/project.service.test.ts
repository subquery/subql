// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { EthereumApi, EthereumApiService } from '../ethereum';
import { ProjectService } from './project.service';

const mockApiService = (): EthereumApiService => {
  const ethApi = new EthereumApi(
    'https://eth.api.onfinality.io/public',
    20,
    new EventEmitter2(),
  );

  // await ethApi.init();

  return {
    unsafeApi: ethApi,
  } as any;
};

describe('ProjectService', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    const apiService = mockApiService();

    projectService = new ProjectService(
      null,
      apiService,
      null,
      null,
      null,
      null,
      null,
      {} as any,
      null,
      null,
      null,
    );
  });

  it('can get a block timestamps', async () => {
    const timestamp = await (projectService as any).getBlockTimestamp(
      4_000_000,
    );

    expect(timestamp).toEqual(new Date('2017-07-09T20:52:47.000Z'));
  });
});
