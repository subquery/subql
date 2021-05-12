// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { BlockHash } from '@polkadot/types/interfaces';
import { take } from 'rxjs/operators';
import { SubqueryProject } from '../configure/project.model';
import { delay } from '../utils/promise';
import { ApiService } from './api.service';

function testSubqueryProject(): SubqueryProject {
  const project = new SubqueryProject();
  project.network = {
    endpoint: 'wss://kusama.api.onfinality.io/public-ws',
    types: {
      TestType: 'u32',
    },
  };
  return project;
}

jest.setTimeout(100000);
describe('ApiService', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  const prepareApiService = async (): Promise<ApiService> => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: SubqueryProject, useFactory: testSubqueryProject },
        ApiService,
      ],
      imports: [EventEmitterModule.forRoot()],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    const apiService = app.get(ApiService);
    await apiService.init();
    return apiService;
  };

  it('can instantiate api', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    expect(api.registry.getDefinition('TestType')).toEqual('u32');
    // workaround for ending the test immediately (before return of subscribeRuntimeVersion)
    // will cause an unhandled promise rejection and affect the result of next test.
    await delay(0.5);
  });

  it('api query is locked at specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(1);
    const validators = await api.query.session.validators.at(blockhash);
    await apiService.setBlockhash(blockhash, true);
    const [patchedValidators, currentValidators] = await Promise.all([
      patchedApi.query.session.validators(),
      api.query.session.validators(),
    ]);
    expect(validators).toMatchObject(patchedValidators);
    expect(patchedValidators).not.toMatchObject(currentValidators);
  }, 30000);

  it('api query input is double map', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    await apiService.setBlockhash(blockhash, true);
    const patchedApi = await apiService.getPatchedApi();
    const apiResults = await api.query.staking.erasStakers.at(
      blockhash,
      2038,
      `DMkKL7AZw9TkNw2NaBdocmFRGUG8r8T4kdGGcB13fv2LARy`,
    );
    const patchedResult = await patchedApi.query.staking.erasStakers(
      2038,
      `DMkKL7AZw9TkNw2NaBdocmFRGUG8r8T4kdGGcB13fv2LARy`,
    );
    expect(apiResults).toEqual(patchedResult);
    await delay(0.5);
  });

  it('api consts is swapped to the specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    // upgrade at 4401242 that maxNominatorRewardedPerValidator changed from 256 to 128
    let blockhash: BlockHash;
    const currentMaxNRPV = api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
    if (currentMaxNRPV === 128) {
      blockhash = await api.rpc.chain.getBlockHash(4401242);
    } else {
      blockhash = await api.rpc.chain.getBlockHash(4401243);
    }
    await apiService.setBlockhash(blockhash, true);

    expect(
      patchedApi.consts.staking.maxNominatorRewardedPerValidator.toNumber(),
    ).not.toEqual(currentMaxNRPV);
  }, 100000);

  it('.tx.*.*, .derive.*.* are removed', async () => {
    const apiService = await prepareApiService();
    const patchedApi = await apiService.getPatchedApi();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    expect(() => patchedApi.tx.staking.rebond(1)).toThrow(/is not supported/);
  }, 30000);

  it('xxx.xxx.multi with input parameter is an array', async () => {
    const account1 = 'E7ncQKp4xayUoUdpraxBjT7NzLoayLJA4TuPcKKboBkJ5GH';
    const account2 = 'F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29';
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    const multiResults = await Promise.all([
      await api.query.system.account.at(blockhash, account1),
      await api.query.system.account.at(blockhash, account2),
    ]);
    await apiService.setBlockhash(blockhash, true);
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const [patchedMultiResults, currentMulti] = await Promise.all([
      patchedApi.query.system.account.multi([account1, account2]),
      api.query.system.account.multi([account1, account2]),
    ]);
    expect(patchedMultiResults.map((r) => r.toJSON())).toEqual(
      multiResults.map((r) => r.toJSON()),
    );
    expect(patchedMultiResults.map((r) => r.toJSON())).not.toEqual(
      currentMulti.map((r) => r.toJSON()),
    );
  });

  it('xxx.xxx.multi with input parameter is a double map', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    await apiService.setBlockhash(blockhash, true);
    const multiResults = await Promise.all([
      await api.query.staking.erasStakers.at(
        blockhash,
        2038,
        `DMkKL7AZw9TkNw2NaBdocmFRGUG8r8T4kdGGcB13fv2LARy`,
      ),
      await api.query.staking.erasStakers.at(
        blockhash,
        2038,
        `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
      ),
    ]);
    const patchedResult = await patchedApi.query.staking.erasStakers.multi([
      [2038, `DMkKL7AZw9TkNw2NaBdocmFRGUG8r8T4kdGGcB13fv2LARy`],
      [2038, `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`],
    ]);
    expect(multiResults).toEqual(patchedResult);
  });

  it('api.queryMulti', async () => {
    const account1 = 'E7ncQKp4xayUoUdpraxBjT7NzLoayLJA4TuPcKKboBkJ5GH';
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    await apiService.setBlockhash(blockhash, true);

    const multiResults = await Promise.all([
      api.query.timestamp.now.at(blockhash),
      await api.query.session.validators.at(blockhash),
      await api.query.system.account.at(blockhash, account1),
      await api.query.staking.erasStakers.at(
        blockhash,
        2038,
        `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
      ),
    ]);

    const patchedApiResults = await patchedApi.queryMulti([
      api.query.timestamp.now, // not in array
      [api.query.session.validators], // zero arg
      [api.query.system.account, account1], //one arg
      [
        api.query.staking.erasStakers,
        2038,
        `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
      ], //double map
    ]);

    expect(multiResults.map((r) => r.toJSON())).toEqual(
      patchedApiResults.map((r) => r.toJSON()),
    );
  });

  it('api.rx.queryMulti', async () => {
    const account1 = 'E7ncQKp4xayUoUdpraxBjT7NzLoayLJA4TuPcKKboBkJ5GH';
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    await apiService.setBlockhash(blockhash, true);

    const multiResults = await Promise.all([
      api.query.timestamp.now.at(blockhash),
      await api.query.session.validators.at(blockhash),
      await api.query.system.account.at(blockhash, account1),
      await api.query.staking.erasStakers.at(
        blockhash,
        2038,
        `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
      ),
    ]);
    const patchedApiRxResults = await (patchedApi.rx as any)
      .queryMulti([
        api.query.timestamp.now, // not in array
        [api.query.session.validators], // zero arg
        [api.query.system.account, account1], //one arg
        [
          api.query.staking.erasStakers,
          2038,
          `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
        ], //double map
      ])
      .pipe(take(1))
      .toPromise();

    expect(multiResults.map((r) => r.toJSON())).toEqual(
      patchedApiRxResults.map((r) => r.toJSON()),
    );
  });

  it('api.#registry is swapped to the specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();
    const registry = patchedApi.registry;
    const callIndexOfBatch = api.tx.utility.batch.callIndex;
    // upgrade at 4401242 that maxNominatorRewardedPerValidator changed from 256 to 128
    const blockhash = await api.rpc.chain.getBlockHash(1);
    await apiService.setBlockhash(blockhash, true);
    const registry2 = patchedApi.registry;
    const call = patchedApi.findCall(callIndexOfBatch);
    expect(call?.method).not.toBe('batch');
    expect(call?.section).not.toBe('utility');
    expect(registry).not.toBe(registry2);
  }, 30000);

  it('support historic api rpc', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi();

    const blockhash = await api.rpc.chain.getBlockHash(4401242);
    await apiService.setBlockhash(blockhash, true);

    const patchedBlock = await patchedApi.rpc.chain.getBlock();
    const apiBlock = await api.rpc.chain.getBlock(blockhash);
    const patchedBlock2 = await patchedApi.rpc.chain.getBlock('0x12312314');

    const patchedApiRxBlock = await (patchedApi.rx as any).rpc.chain
      .getBlock()
      .pipe(take(1))
      .toPromise();

    const patchedApiRxBlock2 = await (patchedApi.rx as any).rpc.chain
      .getBlock('0x12312314')
      .pipe(take(1))
      .toPromise();

    expect(patchedBlock.block.hash.toString()).toEqual(blockhash.toString());
    expect(apiBlock.block.hash.toString()).toEqual(blockhash.toString());
    expect(patchedBlock2.block.hash.toString()).toEqual(blockhash.toString());
    expect(patchedApiRxBlock.block.hash.toString()).toEqual(
      blockhash.toString(),
    );
    expect(patchedApiRxBlock2.block.hash.toString()).toEqual(
      blockhash.toString(),
    );
    expect(() => patchedApi.rpc.author.rotateKeys()).toThrow(
      /is not supported/,
    );
  }, 30000);
});
