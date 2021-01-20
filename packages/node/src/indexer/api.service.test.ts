// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BlockHash } from '@polkadot/types/interfaces';
import { SubqueryProject } from '../configure/project.model';
import { ApiService } from './api.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://kusama.api.onfinality.io/public-ws',
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

  const prepareApiService = async (): Promise<ApiService> => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: SubqueryProject, useFactory: testSubqueryProject },
        ApiService.useFactory,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    return app.get(ApiService);
  };

  it('can instantiate api', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    expect(api.registry.getDefinition('TestType')).toEqual('u32');
  });

  it('api query is locked at specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(1);
    const validators = await api.query.session.validators.at(blockhash);
    await apiService.setBlockhash(blockhash);
    const [patchedValidators, currentValidators] = await Promise.all([
      patchedApi.query.session.validators(),
      api.query.session.validators(),
    ]);
    expect(validators).toMatchObject(patchedValidators);
    expect(patchedValidators).not.toMatchObject(currentValidators);
  }, 30000);

  it('api consts is swapped to the specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    // upgrade at 4401242 that maxNominatorRewardedPerValidator changed from 256 to 128
    let blockhash: BlockHash;
    const currentMaxNRPV = api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
    if (currentMaxNRPV === 128) {
      blockhash = await api.rpc.chain.getBlockHash(4401241);
    } else {
      blockhash = await api.rpc.chain.getBlockHash(4401242);
    }
    await apiService.setBlockhash(blockhash);

    expect(
      patchedApi.consts.staking.maxNominatorRewardedPerValidator.toNumber(),
    ).not.toEqual(currentMaxNRPV);
  }, 30000);

  it('.rpc.*.*, .tx.*.*, .derive.*.* are removed', async () => {
    const apiService = await prepareApiService();
    const patchedApi = await apiService.getPatchedApi();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    expect(() => patchedApi.rpc.chain.getBlock()).toThrow(/is not supported/);
    expect(() => patchedApi.tx.staking.rebond(1)).toThrow(/is not supported/);
  }, 30000);
});
