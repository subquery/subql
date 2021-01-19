// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
    customTypes: {
      TestType: 'u32',
    },
  };
  return project;
}

describe('ApiService', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  it('can instantiate api', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: SubqueryProject, useFactory: testSubqueryProject },
        ApiService,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const apiService = app.get(ApiService);
    const api = await apiService.getApi();
    expect(api.registry.getDefinition('TestType')).toEqual('u32');
  });
});
