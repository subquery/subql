// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { BlockHash } from '@polkadot/types/interfaces';
import { ProjectManifestVersioned } from '@subql/common';
import { GraphQLSchema } from 'graphql';
import { SubqueryProject } from '../configure/SubqueryProject';
import { delay } from '../utils/promise';
import { ApiService } from './api.service';

const WS_ENDPOINT = 'wss://kusama.api.onfinality.io/public-ws';
const HTTP_ENDPOINT = 'https://kusama.api.onfinality.io/public';

const TEST_BLOCKHASH =
  '0x70070f6c1ad5b9ce3d0a09e94086e22b8d4f08a18491183de96614706bf59600'; // kusama #6721189

function testSubqueryProject(endpoint: string): SubqueryProject {
  return {
    network: {
      endpoint,
      dictionary: `https://api.subquery.network/sq/subquery/dictionary-polkadot`,
    },
    dataSources: [],
    id: 'test',
    root: './',
    chainTypes: {
      types: {
        TestType: 'u32',
      },
    },
    schema: new GraphQLSchema({}),
  };
}

jest.setTimeout(90000);
describe('ApiService', () => {
  let app: INestApplication;

  afterEach(async () => {
    return app?.close();
  });

  const prepareApiService = async (
    endpoint: string = WS_ENDPOINT,
  ): Promise<ApiService> => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: SubqueryProject,
          useFactory: () => testSubqueryProject(endpoint),
        },
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

    const apiAt = await api.at(TEST_BLOCKHASH);
    apiAt.registry;
    expect(api.registry.getDefinition('TestType')).toEqual('u32');
    // workaround for ending the test immediately (before return of subscribeRuntimeVersion)
    // will cause an unhandled promise rejection and affect the result of next test.
    await delay(0.5);
  });

  it('api query is locked at specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const blockhash = await api.rpc.chain.getBlockHash(1);
    const validators = await api.query.session.validators.at(blockhash);
    const patchedApi = await apiService.getPatchedApi(blockhash);
    const [patchedValidators, currentValidators] = await Promise.all([
      patchedApi.query.session.validators(),
      api.query.session.validators(),
    ]);
    expect(validators).toMatchObject(patchedValidators);
    expect(patchedValidators).not.toMatchObject(currentValidators);
  });

  it('api query input is double map', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const blockhash = await api.rpc.chain.getBlockHash(6721189);
    const patchedApi = await apiService.getPatchedApi(blockhash);
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

  it.skip('api consts is swapped to the specified block', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    // upgrade at 4401242 that maxNominatorRewardedPerValidator changed from 256 to 128
    let blockhash: BlockHash;
    const currentMaxNRPV =
      api.consts.staking.maxNominatorRewardedPerValidator.toNumber();
    if (currentMaxNRPV === 128) {
      blockhash = await api.rpc.chain.getBlockHash(4401242);
    } else {
      blockhash = await api.rpc.chain.getBlockHash(4401243);
    }
    const patchedApi = await apiService.getPatchedApi(blockhash);

    expect(
      patchedApi.consts.staking.maxNominatorRewardedPerValidator.toNumber(),
    ).not.toEqual(currentMaxNRPV);
  });

  // it('.tx.*.*, .derive.*.* are removed', async () => {
  //   const apiService = await prepareApiService();
  //   const blockhash = await apiService.getApi().rpc.chain.getBlockHash(6721189);
  //   const patchedApi = await apiService.getPatchedApi(blockhash);
  //   // eslint-disable-next-line @typescript-eslint/promise-function-async
  //   expect(() => patchedApi.tx.staking.rebond(1)).toThrow(/is not supported/);
  // });

  it.skip('.rx.*.* are removed', async () => {
    const apiService = await prepareApiService();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    expect(() => patchedApi.rx.query.staking.activeEra()).toThrow(
      /is not supported/,
    );
  });

  it('api.at,xxx,xxx are removed, ', async () => {
    const apiService = await prepareApiService();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
    expect((patchedApi as any).at).toBeUndefined();
  });

  it.skip('xxx.xxx.multi with input parameter is an array', async () => {
    const account1 = 'E7ncQKp4xayUoUdpraxBjT7NzLoayLJA4TuPcKKboBkJ5GH';
    const account2 = 'F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29';
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const multiResults = await Promise.all([
      await api.query.system.account.at(TEST_BLOCKHASH, account1),
      await api.query.system.account.at(TEST_BLOCKHASH, account2),
    ]);
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
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

  it.skip('xxx.xxx.multi with input parameter is a double map', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
    const multiResults = await Promise.all([
      await api.query.staking.erasStakers.at(
        TEST_BLOCKHASH,
        2038,
        `DMkKL7AZw9TkNw2NaBdocmFRGUG8r8T4kdGGcB13fv2LARy`,
      ),
      await api.query.staking.erasStakers.at(
        TEST_BLOCKHASH,
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
    const account = 'E7ncQKp4xayUoUdpraxBjT7NzLoayLJA4TuPcKKboBkJ5GH';
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);

    const multiResults = await Promise.all([
      api.query.timestamp.now.at(TEST_BLOCKHASH),
      await api.query.session.validators.at(TEST_BLOCKHASH),
      await api.query.system.account.at(TEST_BLOCKHASH, account),
      await api.query.staking.erasStakers.at(
        TEST_BLOCKHASH,
        2038,
        `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`,
      ),
    ]);

    const patchedApiResults = await patchedApi.queryMulti([
      patchedApi.query.timestamp.now, // not in array
      [patchedApi.query.session.validators], // zero arg
      [patchedApi.query.system.account, account], //one arg
      [
        patchedApi.query.staking.erasStakers,
        [2038, `HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq`],
      ], // arg in array
    ]);

    expect(multiResults.map((r) => r.toJSON())).toEqual(
      patchedApiResults.map((r) => r.toJSON()),
    );
  });

  it.skip('api.rx.queryMulti is not supported', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
    expect(() =>
      (patchedApi.rx as any).queryMulti(
        [api.query.timestamp.now],
        [api.query.session.validators],
      ),
    ).toThrow(/is not supported/);
  });

  it('support .entries', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();
    const patchedApi = await apiService.getPatchedApi(TEST_BLOCKHASH);
    const patchedResult = await patchedApi.query.staking.erasStakers.entries(
      2038,
    );
    const apiAt = await api.at(TEST_BLOCKHASH);
    const result = await apiAt.query.staking.erasStakers.entries(2038);
    expect(patchedResult).toEqual(result);
  });

  it('support historic api rpc', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();

    const blockhash = await api.rpc.chain.getBlockHash(4401242);
    const patchedApi = await apiService.getPatchedApi(blockhash);

    const b1 = await patchedApi.rpc.chain.getBlock();
    const apiBlock = await api.rpc.chain.getBlock(blockhash);
    const b2 = await patchedApi.rpc.chain.getBlock('0x12312314');

    expect(b1.block.hash.toString()).toEqual(blockhash.toString());
    expect(apiBlock.block.hash.toString()).toEqual(blockhash.toString());
    expect(b2.block.hash.toString()).toEqual(blockhash.toString());
    expect(() => patchedApi.rpc.author.rotateKeys()).toThrow(
      /is not supported/,
    );
  });

  it('successful set block hash when continuous call api.xxx.xxx.at ', async () => {
    const apiService = await prepareApiService();
    const api = apiService.getApi();

    const blockhash1 = await api.rpc.chain.getBlockHash(1378036);
    let patchedApi = await apiService.getPatchedApi(blockhash1);
    const validators1 = await patchedApi.query.session.validators();

    const blockhash2 = await api.rpc.chain.getBlockHash(1385137);
    patchedApi = await apiService.getPatchedApi(blockhash2);
    const validators2 = await patchedApi.query.session.validators();
    // prettier-ignore
    const expectedValidators1=  ['FiHWU9AjN7z2no8zyiVEXtiTE46izxDgEcF1KM4r2r1GK59', 'EQBwtmKWCyRrQ8yGWg7LkB8p7hpEKXZz4qUg9WR8hZmieCM', 'EviBmmkq5o5ak2jUo71SPuDEdwGTr8Yz8U5tXBgF6fy8kKV', 'EfK27sX89DpagD3TCF4hF4rGZ1CnCGtYZvo94HZLU3GQuMj', 'Feu9bCUFaYSbkeqSY485kJjUoizp9CG4z3iSnGMwTqWSLeH', 'GTzRQPzkcuynHgkEHhsPBFpKdh4sAacVRsnd8vYfPpTMeEY', 'DaCSCEQBRmMaBLRQQ5y7swdtfRzjcsewVgCCmngeigwLiax', 'GRzsaGxLApkBfsUSCHKLnxhe4QECX4E2kQ5LuV4qqcijN2B', 'GCiTn1UJQT9TE5iamqoKweVoWGRZr9DF8uKXL4cG98fXczf', 'D948vxMSA6u7G5gqPGQdAUDMJbiR7wgqZ1La8XeBiXr9FTF', 'FLpAi7Zi4AB1JqJHWMrub4Umj4X73mZ5dAWE7Q6uS5e82pE', 'FUfXiFsaoWbUeaWiWBDizP7VbTSLxMirbJEpLAk1g6YueJp', 'Few2tfYD3wfyQXPCVkiqK8UGfuj5FK6ecadwfAmJQHBtASX', 'EGZEgucx8vTCSak5uBwwkPkZ7FiYCWYmhpMjWFupdMAq2BN', 'FD3A8DXs16wGvcoi9stjpwz2pmxXFymTkVyVM4Tq5z6LWCK', 'EdEQVcrr4pvzDLdb5xFkncKYhCE6uyuE1eKRTqg4PDvBgMa', 'DKUQiUWNPGvGYrgaxWqduJVRqWUYXUeKprX9EJENhxYvVyS', 'Dg5QS2TKCMQbbZau7acRXHPN4xQxqqase8awmzLXXgmXb7w', 'FtqCc5yLcLc1FkLyftyNuCtYFCudo3unwwPQLzCbnWppjoc', 'FXezGfeLvze1DWUwwEc8MczpLSMnZrSDrcA7Ghyc84NaXGt', 'FAtJupteW5urNYVQvUcLaw2X9xtdwjumK2gvJpuBnAwFHvq', 'FDDy3cQa7JXiChYU2xq1B2WUUJBpZpZ51qn2tiN1DqDMEpS', 'DrQHiQu5VkaRuv1H3iELXVqsvD3SV3E8xNjJqXUgECSg23R', 'Fsspzse4QY1KqagdyrVqDt7cmVBr3HSVsfJ38WKgxsLVaXo', 'Ed6JFR7JmeGtmrubAbXtJRjq9FPWhGRWMdmYnLRcsqaabT8', 'Gc6YgfbTJ6pYXcwib6mk3KoiwncLm4dfdcN3nwFjvfi4Agd', 'Fgqjkry96qFLpRqPZstNzgaqKXiVyrpzTqD55neMdW8PK6g', 'Gth5jQA6v9EFbpqSPgXcsvpGSrbTdWwmBADnqa36ptjs5m5', 'EuJcihtEgC121KMSa2TscWHmTF3ecJzzgHeNnQwLp4tBReG', 'JJ2VvJMZxxW2pst7z6zxrD4VVPhH6YtemYsLeKWeQ9MKX3n', 'GqGHrVZ3h2LznE2snJZ6emccobBKpgx5pmumTApDNcPFuPr', 'ESNZ8Eg46ByUYoAhr8MPbGpGF82pgmmjE3uVVepPCnJC61r', 'EaWWcRin5KwuXYFZA7ANuMCydQHjM5MofStJGusASGeXrrs', 'EMa2d6yYb3CPxyArDCzsMfngnDKUbRL6QdogfYAPKZmmN1E', 'J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D', 'Dojkd9b69TqwZ9W7BJuUomD6N59WBZ39G4sts69QDYJxKjW', 'Dksma151w4n2LRADiR2aYbdhKff47QQ6cTmBo9PpfJUb7cd', 'HWFQjF7phgRTPPjFFD2bHG9aUsEbM1p4Zwj5MjpL6iu66wH', 'Gt6HqWBhdu4Sy1u8ASTbS1qf2Ac5gwdegwr8tWN8saMxPt5', 'FAp5gVpwhwdmnJ1Ycet9z6Uva5tnfyCfA3AaY7WGi7u3DU4', 'Etij9aH36W1NjjWbR7wB5j41CmfpqAx8D4V4HCJhUydSH9Y', 'Cwr82cUKvfgnQSnLeN84CmtNaUGjYBD2qaBjsTxG43ZNh2M', 'FJaSzBUAJ1Nwa1u5TbKAFZG5MBtcUouTixdP7hAkmce2SDS', 'F8PTaGuZQo5fgRBFuhNnhd5euFiR3KLQNMVhYD5BduPKpHr', 'H9R6HgnZKtrcfBJP2M6WCvLJvp72Q96eURbCxmj6KCFVWjh', 'JKjFSGnsXeqhhPgvBmKb6vUnrTZHu17eydEDnpcorCnZXLG', 'EY35xeDhXibMDS5GmdHM2UzpvT4VoV9fGXDy3Muq6cyLPja', 'G7Ur4BnMSfP2qE7ruSob5gwGQ5nzkGWu7Yqh14FcMqnDtgB', 'EJGDDXSMXhwnJMrDs2KjMaznMtms9iFrYNhRL3shkMi9xLt', 'DXrJrPLLBHuapmYJ6tfuUStKubhykWmpgLckJpgFgjp2JvV', 'GCNHHRBtpDcgADCaRPMNNk52JiitGrcv3DMQxwE6owXAfbt', 'DiCVHECatzBxCKZeCmQhvqbAo9KK6CHubAWtQF85N3YbKFW', 'JECeyN45Ycx5t1M1hj2pBbsEZpdeGzDsYA1Wrt2Tdte2wV7', 'D8xUmqpe2aJd2QEPpG4pN3xZvboeQ21wwPhbNRCixrLq8Sj', 'HqZG9NMeeHLuHq4v3JmwVkHvGoEGAnrnNfYSvd2VYADNi7Z', 'FSpw3yUXP6NUHpkCcYhoeihK7ni5XugwDLSRpPaypyLGTGr', 'Cdaq3iUobZLYD2d8oqRQf1VKuRo6H64KsMBgJyxap4ZnARX', 'EtgM5E6pecndYpKCLkfYeRfKSmVxT1mVvaxceJFnhuKqTpG', 'Ff9DYio1TgYTyDU9z8Howt9pXCnuUPmsCY1ijfLBxSsJahj', 'H6bJZpE7PTFZgkLWGbeP3D1PqPGsFGqYAArFYa3ksCskmbt', 'DzmvnHyHyPN2kBHYQpXmrrUvV8KNzDgTPE2Ri2cjDuXhhLt', 'J6RoE9MSpnZhX7hniJAJjBCcTqpr49SNhLvaVeJgFd69TJZ', 'J6xn7Mr8pfed6gvvRPZ8HEEb89RCwheTBtxymg9Xw36hUUS', 'EdUs96fjEhyaTVxZsFo3fxEABLSpdopBFuhE7FFexCUyDv6', 'HvdGhdYcsJcSVBYnUEtHGpzV5A4XunjYWi8HAK8bGLvXdAb', 'FSfBJoCU9sRhCYWwQ55iBNGU5L8eu56iGnYGK9zizHxu8dY', 'GPdebankLfiSGaEPQWJBVULEmX2VpNdnyqsa1uiFJGDhTdT', 'Fk3yTFztZdZa4a7yBpisz9ceMyjgYLtZ9CKSCfFNVhoW2ZC', 'DokiayXWoMvotzchNdLSH4P4Fe7EvMESZvZL4Fn3NekoFtf', 'GfYXsuFn8MVensbKc6gKjPpxXMNh1LzcrBn4BfhNMgK1zKH', 'DuRV4MSm54UoX3MpFe3P7rxjBFLfnKRThxG66s4n3yF8qbJ', 'HhTownCNpkSbjLmtG6KdMhh7FJ2SLXxZcGXhHHeqpbchqcK', 'HyTJYoYwA8GGgDH2XVnUhsPgMq7nnnE4Qq2BdwmpdHNzSdo', 'GFwtzkxkTCFmXhVARYifwBK5D1JgCUmKynWhnv1CZgm9JNS', 'H9bhxgaMbND1u7TXxmMpcQCTiLfQtGmdmwAyKkRnKsndSXa', 'Fk6p456PTU6Sju2b83Cy8rU3NGFsXmWk9BrcqaMqhWW1jWf', 'DKinge6g7FNNj3hJZJUze6GByxkLR7ipCqrnuSQKGRMg37G', 'EUwcW86EFGDoDfUP2UJYuBwhCWC7cW9SdFH9cPh6UPBvBHj', 'FcjmeNzPk3vgdENm1rHeiMCxFK96beUoi2kb59FmCoZtkGF', 'F2GF2vuTCCmx8PnUNpWHTd5hTzjdbufa2uxdq2uT7PC5s9k', 'J1aHBD7YQ3xnSwgFJNokjsEo7NjLTf36ZEHD2LTpeo7KAq8', 'HJ1dGPxVr13KHGiCTGQfZjZMKGc8J52CsHEjcEXNMDyeGxf', 'FagAVsTYT8QghxypUtLcfnmnnhPhPpf854UNuptpQKuNndK', 'CmfwTdJ1F7Qd2HLAQ6A8FdNtz9hKvTMr2FkWtBQR1vECYjo', 'GbpLB9AZwVBBfecbMoTv3HCVb6irwN6y5YeA7uDNoUuRFrL', 'D3JqthKZjAEge84RQ3dheuQmaX2nVhk9A3sHY1rGNbStiFg', 'DEFQigjrErCANqTMiTRuy7BB5L46q9C36Bxqe41GV1yR6vA', 'F7BeW4g5ViG8xGJQAzguGPxiX9QNdoPNc3YqF1bV8d9XkVV', 'DGC4rANssfdpry7FQFznHo2b3QbDHyQZM58esJU6RskB41y', 'HvjQwyG8NDFSD3ZP7VTbfBXHw4mZZd7LRMTcaj9TdfLynzu', 'Faa8iXWy2wxo7ryLEhGCNeb55d8rnVy9SN25NiCmmqP6QMV', 'FwPTgWjafLgtxoRHK7pkUc2NJ9YzD7wHeCny2fMk41T9jKW', 'ErVvRnhXrJS7W9rTtnDECpZTFyLACtDcXEPtzEyYw4b8zcg', 'GSWsxFWwvfpppd4q5iBa3fiBp3twEGvtYZFWNRVF17And24', 'HHARzd4icVZULpMVEGZRiLhjfb3iDDohg1bdHRBusrMUvfd', 'G9vLBYmeiQcD8t53djad6sH2MALaeJy9zaEUyknEVma9sa6', 'HZvvFHgPdhDr6DHN43xT1sP5fDyzLDFv5t5xwmXBrm6dusm', 'ESaTdKYYtRYhJbYjMzgKauNyZHbaNzx2vknC9eioqKusWSt', 'FSETB7JeTuTsJBYzUcKBtHXBYtBft3pZ87FUxP2GaY4acFh', 'GqomGHs3CpaoG7kemv9hb6LCaBSazXMPaaCyDrP6CxRrgcF', 'DDkGq46ftxusKM4n4jfEr7MBW1DPGuVQDeExMFQbRtnsenD', 'F8DXBsUQrvVvL9AvkEqxykmy1AWcBcn2CqjG3nyzYRFVJeS', 'G7eJUS1A7CdcRb2Y3zEDvfAJrM1QtacgG6mPD1RsPTJXxPQ', 'Db2P54HPMkR8kqbP5RfWuXRFKhZ8NLQ77aT7VBZYfpKqTGP', 'EdWNepHg6UUyqK433qDpBjJ4ZUmyvnoQPLDFs69dExG1Dii', 'FzBBpxixSuZkeXxXeiUbvFYxcd3JAP5BEAcgDuhRudJTwmZ', 'Eg2z2dcScFf4foDN4Gxn6JoJ7JeDN1U7m49jNssUZMLtNrD', 'HeCK315sYXruJvZKB5uXtEBnpWwYHFaKfNNZ54G76Qr7Nkn', 'HshTdrZiSJntTRh5oNytD2QuT38VDJHoGQmfcrtrZbViSGL', 'Foc4anJqDfTMY3CvpCZzK9kUSudwc2oUTJ19K1E3JYFKy9j', 'FyRaMYvPqpNGq6PFGCcUWcJJWKgEz29ZFbdsnoNAczC2wJZ', 'CoqysGbay3t3Q7hXgEmGJJquhYYpo8PqLwvW1WsUwR7KvXm', 'GcgPeEtLketwNDVVdV2jEnaTU5RMdGQdpYqVshssBWy1txZ', 'H72hS8xLmSiSBqbBXHND2KbN8PAoevi52B685cbGki6T9nt', 'H4V7fZJPLiGtBvQfsadb7oGfV1StiXJTuca76Daa449rz27', 'J2HVhQBYpx5PkyxHYLsp555pvWzc2zvGfNUnTwgzvRqVGqm', 'GiBnzCGFofhmAvsUv9FUShUb8YJYYwWex3ThQNkbDDNprS6', 'HnnFkvtzrSrNpSUdG47E9ioBmDoDBnRUL6Lmy7GeqGcFc5c', 'GeYJhboY5bEc5WZFbrdxhEF9m6Y4NnbKzfCu1rBHxGWgviK', 'DGiLC1uvohfgHiirDtsr5HJRYXUFy9NdXj6YC6azcaRpvJZ', 'HP8qJ8P4u4W2QgsJ8jzVuSsjfFTT6orQomFD6eTRSGEbiTK', 'EoeAhrhJv2p6Sg5T67mxkLwrPnjKbH7iZSh8q1JTyvELvrR', 'FXCgfz7AzQA1fNaUqubSgXxGh77sjWVVkypgueWLmAcwv79', 'EXkCSUQ6Z1hKvGWMNkUDKrTMVHRduQHWc8G6vgo4NccUmhU', 'HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq', 'GCsSfxv6h9mQ27s93ggBwzfguT6V61kmh8iadKSXAgQgKs5', 'E2ZKmzMzajqW838jXVSM5DyoUJUdEQddXNknEjoTwj2zBLj', 'GhyKZDoTghgvYqh1ensnGU1Vc1EY3Nwvhw5XdjTR8yfnEpV', 'GxujeV9rVRqsQHMbTiAiHATuZyrcHC68ZUJHtqS4LufuWLk', 'E7aXaaVBzDbhF8HevpcwDnWEu9mBRE6ai69JToi4fyz8c5P', 'DatW7XKJaJbfHLoVzVCHwAcwMySW9CRb6gFs9TpNNcCz9Mv', 'D8BfryaM5xN62UuKUpLK5zbZEUSBtA76yP9YddQTKXi9pkB', 'EtJ4HxHYEDvYWRJAdmV4hYpTbGMJCmEgnLC8zAf6u5ZyT7C', 'FtcERzFaCxB2ZR17PVeNxjAntfQ8a9KwS5i1bTYGWq15Yab', 'Gk6v5CXUy2cPMtVxXtN7ZUn7K5y7UFEm78xp98Uatjt2yuV', 'HqHeKZnc38rX2BJrmJiXfkqHUEUn56B9Nck6WgdiGeKUYBE', 'FwUst6h6JfHAK2tyhM9zCrKb1zSCgSe5kaoXZeqnVpbGGgt', 'CihSipv2H9mYBkRznedBZFxCNUrqvdmSH1Ptx5kSNRr3DEx', 'JKsMAG8Kpm9szen7Crx2FUrhzdwK9hAocA4X1mmQYYvRsrE', 'CpYNXnYC1mPPRSXMHvm9EUuhEqHjvj6kCN4kshqMdEpPYSF', 'CaSNtNAiKEsQiTcEU9DamgFeji9Hh63QFo91XrmftCTNBva', 'EKBtVYjZ6MMzRf334L1Zztf29kim8LrV5myftD3ABrmTHZd', 'DB2mp5nNhbFN86J9hxoAog8JALMhDXgwvWMxrRMLNUFMEY4', 'Dab4bfYTZRUDMWjYAUQuFbDreQ9mt7nULWu3Dw7jodbzVe9', 'EqWK9adqE7ZFBXAhTw5KXh6ZkMRKdxA555yHgj5tWQyPJYH', 'D5Xo7N2jginhYchuMNud2dYtby899koFcaRo2YWNmUquo5H', 'CsHw8cfzbnKdkCuUq24yuaPyJ1E5a55sNPqejJZ4h7CRtEs', 'JKcDN2BUrteeUZa5fxuTsPjpUZpNGE9NHVY1NUboHEQbmhN', 'CuCgiLpBEcfLEjwS8CBsEN4EWSvTF7vHeN6damkrv934kfZ', 'HEmqZS2Lw5nhGuddLjTm2KCcmsUddQXJM5bGVeA5GBWam6w', 'GS9UR4YmAib1NKWiQmxVpNytcriChSBPDZQyGJhYnunXPQ9', 'HPWceq92prqJVYnYfoZGzEwRGC5jCwGjArZcZzYAC7hXR9e', 'GKingZDLzrPimpMMCxWYT7ck8jXra2vvNkCUztUwyDT2Qet', 'Gh2cm56nMokKQ4frPx7r7UsXtimH6ckaXyKKogGn5dQ3yrD', 'Go5ov2WmFx2H9LfvaS3ec24TropY6Fgjcv56wBchyUv18a7', 'Fd9kKxogYUZLCoMz3uvjFTCkSGXRvgrKh7GEdbSK2yHd4oq', 'Cdhjt72TSezVDkUzdgyoSwXByfwQJjuXSYcDs5L8snyB8Yx', 'EzR9J3Afvash2tYCk8ZZwPYyq3zy92adVUXKcYjbYN46JWL', 'ELhnYFneiAP819s1t7Zmn4rs1tBbcrWVnkeGw4JYKdVp6jL', 'EicrAEbyauqktQpp4CdvsF2CQy3Ju7tGGMohj3h5sAPnKHL'];
    // prettier-ignore
    const expectedValidators2 = ['J2HVhQBYpx5PkyxHYLsp555pvWzc2zvGfNUnTwgzvRqVGqm', 'F8PTaGuZQo5fgRBFuhNnhd5euFiR3KLQNMVhYD5BduPKpHr', 'F7ia6uitDknF5HhGQnTPuBdqFM3nTqpMP8oeWgjU4gWiaVm', 'EafgFRX24PTgJAjGoaDuQLXQiLX4daSFQQttzGVticSD18o', 'F7BeW4g5ViG8xGJQAzguGPxiX9QNdoPNc3YqF1bV8d9XkVV', 'EqyCQvYn1cHBdzFVQHQeL1nHDcxHhjWR8V48KbDyHyuyCGV', 'HAGcVQikZmEEgBBaChwjTVdwdA53Qopg2AYUtqw738C5kUq', 'FAYyBS6arn3X4fvtdybaBUdw5zqVsv3PPwRXXXYRTzTGFDv', 'EZ7uBY7ZLohavWAugjTSUVVSABLfad77S6RQf4pDe3cV9q4', 'Faaf2qgwtaFum78U8TdEPnUd4u7HPk65cdaFj7KbEA6wi2Y', 'HA5jB52fFL1v4EoEHV4WgEiFZr7wGLiuBDZtSmnwKypvat7', 'EicrAEbyauqktQpp4CdvsF2CQy3Ju7tGGMohj3h5sAPnKHL', 'HWAGAxX2PAzNVg7w3ZyTprH5yvwbVwQ8rbWwuZxtQKbQupW', 'EXkCSUQ6Z1hKvGWMNkUDKrTMVHRduQHWc8G6vgo4NccUmhU', 'EdEQVcrr4pvzDLdb5xFkncKYhCE6uyuE1eKRTqg4PDvBgMa', 'DfiSM1qqP11ECaekbA64L2ENcsWEpGk8df8wf1LAfV2sBd4', 'E457XaKbj2yTB2URy8N4UuzmyuFRkcdxYs67UvSgVr7HyFb', 'FiBHHbxDiVysvn5YBV78YFVUUykZRfQYhjxymu8VXnTqNMr', 'DDkGq46ftxusKM4n4jfEr7MBW1DPGuVQDeExMFQbRtnsenD', 'H4V7fZJPLiGtBvQfsadb7oGfV1StiXJTuca76Daa449rz27', 'Hadx1N8xZq6tRtXWkm6s5madXTXqVhauDNmesZnpMYTufcv', 'Ed6JFR7JmeGtmrubAbXtJRjq9FPWhGRWMdmYnLRcsqaabT8', 'FpVmbKAqwoQaTBGwrTGsSu4nN1PCGY8XrQa4AaJVuzyVhh2', 'DimyMqRfrnqudRLVf5TxAM3T7X23PKvFDp85DDGabFKMQ2a', 'GhoRyTGK583sJec8aSiyyJCsP2PQXJ2RK7iPGUjLtuX8XCn', 'HeKaZXya7rPQq7h7KgKnb3jG7n7VBFPr7PFTFYd6ZQbZRiU', 'FXCgfz7AzQA1fNaUqubSgXxGh77sjWVVkypgueWLmAcwv79', 'DEFQigjrErCANqTMiTRuy7BB5L46q9C36Bxqe41GV1yR6vA', 'CoooBnE4hYaaQSKUDyCmZNdn8uE94rWa5ez3jrpFDE88vVA', 'GffdZaTf5oBcHVfx4VjnA6AMpHEBa3PiaBzTBUPkt24fUxp', 'HqGhgHg6YvnhaXSnaAUvyTDiR4FirB6Ssh2XNDedTzwCDv2', 'CinNnPhc4aGFQb7FWhUpnfwCNwXN3brcnCR1MkazkstcDJa', 'Fsspzse4QY1KqagdyrVqDt7cmVBr3HSVsfJ38WKgxsLVaXo', 'EoeAhrhJv2p6Sg5T67mxkLwrPnjKbH7iZSh8q1JTyvELvrR', 'GfXJERNZeUXh75pdFwksC9y42sftVti9K2AWntarJeM3gM4', 'Dg5QS2TKCMQbbZau7acRXHPN4xQxqqase8awmzLXXgmXb7w', 'Hqa9LGT3qF96agPYYbdfmUzh5P94MX9sqfF1WN4JnfRRVir', 'Gt6HqWBhdu4Sy1u8ASTbS1qf2Ac5gwdegwr8tWN8saMxPt5', 'Eyvj7oeaHyoqJbNPKPi3zjBks2bNoju3X29xJhsxD8d6GeQ', 'DGiLC1uvohfgHiirDtsr5HJRYXUFy9NdXj6YC6azcaRpvJZ', 'JLKcPk652UTtQfyrk7keyU6vqAEj5JXzDAvQdPxB1DJTnZ3', 'EPehck28w8fjRZCqZ3VZA7XpwGeipuVU4ETSwv7GkF5BdcG', 'CmfwTdJ1F7Qd2HLAQ6A8FdNtz9hKvTMr2FkWtBQR1vECYjo', 'F7Wa1su7NRSr6LWuhPWdXcQALDyzm8Vmev7WtV5jVPtJELs', 'HRMhY2CtVMp2yVSieKvq8Y8FHAhRKrGGMd6MoQe3iN6uJ2D', 'GiBnzCGFofhmAvsUv9FUShUb8YJYYwWex3ThQNkbDDNprS6', 'GC8hwHbQ4TdbYJJPDS96G7Uj9bivnW5z56UEkqujjwhQPp5', 'FmQHyUXoRkGTRySqVUy7NBAVhkKFvTtRtkzVTjZgBzbDzum', 'HgWWnAXFGikrPVD2FrZ6CRk7KnYdVDn7zVyye8hqFPMc5g1', 'FUfXiFsaoWbUeaWiWBDizP7VbTSLxMirbJEpLAk1g6YueJp', 'G7Ur4BnMSfP2qE7ruSob5gwGQ5nzkGWu7Yqh14FcMqnDtgB', 'FrL6qzw8bAFS6MTpbwLzEuAU9SCnALD5qMj9ZYFyt6zk5o4', 'DaCSCEQBRmMaBLRQQ5y7swdtfRzjcsewVgCCmngeigwLiax', 'J1aHBD7YQ3xnSwgFJNokjsEo7NjLTf36ZEHD2LTpeo7KAq8', 'HvjQwyG8NDFSD3ZP7VTbfBXHw4mZZd7LRMTcaj9TdfLynzu', 'D5NGokAYvFZmvFynjApN2DG4r1H1cQ9pyum7KC3KmtDYLkn', 'DFaiE6wT1caQ9u7eLkuphVQqbywWKzYjm5vRsMgk43GSb84', 'DwZBcfHnJtRmR7P23VgHQEzaeGPXQvH8jDvuob2qiyTHJMM', 'EibDgpnEGwqvWDcPUq7EThEB6kPEnqKuZog48E5jga8uWe8', 'GcqKn3HHodwcFc3Pg3Evcbc43m7qJNMiMv744e5WMSS7TGn', 'DSpbbk6HKKyS78c4KDLSxCetqbwnsemv2iocVXwNe2FAvWC', 'HJ1dGPxVr13KHGiCTGQfZjZMKGc8J52CsHEjcEXNMDyeGxf', 'DB2mp5nNhbFN86J9hxoAog8JALMhDXgwvWMxrRMLNUFMEY4', 'HWpid7FWbuA7GxN1yykrYqSe6cY3ybUaX3qErCoiiFDSqSh', 'JHTXKwYBhRZKWPW3nbtwtfE8dfRDYCS65cJXueMhg11k4cs', 'FtqCc5yLcLc1FkLyftyNuCtYFCudo3unwwPQLzCbnWppjoc', 'EzR9J3Afvash2tYCk8ZZwPYyq3zy92adVUXKcYjbYN46JWL', 'DGC4rANssfdpry7FQFznHo2b3QbDHyQZM58esJU6RskB41y', 'DbuPiksDXhFFEWgjsEghUypTJjQKyULiNESYji3Gaose2NV', 'HP8qJ8P4u4W2QgsJ8jzVuSsjfFTT6orQomFD6eTRSGEbiTK', 'ESaTdKYYtRYhJbYjMzgKauNyZHbaNzx2vknC9eioqKusWSt', 'DriCrAgdVV57NeQm5bWn5KQpVndVnXnm55BjRpe6qzZ5ktJ', 'HTrpbES27bqMvCioQGHpmJbBzwji6V5DeuXUfB1gsZ5Vkh1', 'EUwcW86EFGDoDfUP2UJYuBwhCWC7cW9SdFH9cPh6UPBvBHj', 'GeYJhboY5bEc5WZFbrdxhEF9m6Y4NnbKzfCu1rBHxGWgviK', 'JDA8ByXeJcn2BfNabC6WbBJKEBwM4k7oBVenVgJdzL32RJc', 'FLpAi7Zi4AB1JqJHWMrub4Umj4X73mZ5dAWE7Q6uS5e82pE', 'CmD9vaMYoiKe7HiFnfkftwvhKbxN9bhyjcDrfFRGbifJEG8', 'EUoo6xidm7okewmbh89tUW3sqaDLYKAvTCCNYc8zh4nPU4s', 'F4xrhkWsW2PSqZBuBMVJGE3LQy7R2ZWo3J8d6KEsDznrDF8', 'F4LocUbsPrcC8xVap4wiTgDakzn3xFyXneuYDHRaHxnb6dH', 'H9bhxgaMbND1u7TXxmMpcQCTiLfQtGmdmwAyKkRnKsndSXa', 'ErVvRnhXrJS7W9rTtnDECpZTFyLACtDcXEPtzEyYw4b8zcg', 'J6RoE9MSpnZhX7hniJAJjBCcTqpr49SNhLvaVeJgFd69TJZ', 'Few2tfYD3wfyQXPCVkiqK8UGfuj5FK6ecadwfAmJQHBtASX', 'Etij9aH36W1NjjWbR7wB5j41CmfpqAx8D4V4HCJhUydSH9Y', 'Gc6YgfbTJ6pYXcwib6mk3KoiwncLm4dfdcN3nwFjvfi4Agd', 'DAT4gSgyMskggCmTQKfEM6hQgRy1NWdhtfMTAuPLsUAGUPy', 'HqFz5RBczgtKrHQGav7DFZwSwrDXxKjLWc95mMDidVdfpwC', 'GLiebiQp5f6G5vNcc7BgRE9T3hrZSYDwP6evERn3hEczdaM', 'G7mWyu1Pom5XreLHUzDEcvFp6WaMuLuo4QKxtDB9yJZnH69', 'FXezGfeLvze1DWUwwEc8MczpLSMnZrSDrcA7Ghyc84NaXGt', 'HnnFkvtzrSrNpSUdG47E9ioBmDoDBnRUL6Lmy7GeqGcFc5c', 'Gth5jQA6v9EFbpqSPgXcsvpGSrbTdWwmBADnqa36ptjs5m5', 'E2ZKmzMzajqW838jXVSM5DyoUJUdEQddXNknEjoTwj2zBLj', 'Eodfj4xjkw8ZFLLSS5RfP6vCMw8aM6qfM7BfeQMf6ivFWHy', 'GXaUd6gyCaEoBVzXnkLVGneCF3idnLNtNZs5RHTugb9dCpY', 'D948vxMSA6u7G5gqPGQdAUDMJbiR7wgqZ1La8XeBiXr9FTF', 'Fgqjkry96qFLpRqPZstNzgaqKXiVyrpzTqD55neMdW8PK6g', 'EfK27sX89DpagD3TCF4hF4rGZ1CnCGtYZvo94HZLU3GQuMj', 'DTLcUu92NoQw4gg6VmNgXeYQiNywDhfYMQBPYg2Y1W6AkJF', 'CrzGYAYYnguxoR5pGx4UbwLs2DkoxoLiLJd8kjZMQzDuq8r', 'E58yuhUAwWzhn2V4thF3VciAJU75eePPipMhxWZe9JKVVfq', 'JKjFSGnsXeqhhPgvBmKb6vUnrTZHu17eydEDnpcorCnZXLG', 'H6bJZpE7PTFZgkLWGbeP3D1PqPGsFGqYAArFYa3ksCskmbt', 'Fy2rsYCoowQBtuFXqLE65ehAY9T6KWcGiNCQAyPDCkfpm4s', 'FKJNhxaXraoh85DRvChSzoDKHMAk9cZYxoq5LQW7uqeAQMD', 'FBichC4g5HBmdWCu3ebdADWQbvjbN7KdodNKWBYpLFgxCcd', 'G7eJUS1A7CdcRb2Y3zEDvfAJrM1QtacgG6mPD1RsPTJXxPQ', 'G866nkBvVKUqTFwAukeLM7n6QH9JyJDUJ2EvGFzKdymzqc3', 'FAGzHVggwv1QRmkGjom1Foc24jzZS1CJGcWUzrGdW8FyXEm', 'FwPTgWjafLgtxoRHK7pkUc2NJ9YzD7wHeCny2fMk41T9jKW', 'GAfhRsNqB9hwEmRFPhMZCvicFJ1kVtRF3UChYyKHq612ZV9', 'FAp5gVpwhwdmnJ1Ycet9z6Uva5tnfyCfA3AaY7WGi7u3DU4', 'GU7kw1ZYDKchyzhrAQ3imiY7s4fsoeFCvgeaU5XkTi9ABuB', 'EGZEgucx8vTCSak5uBwwkPkZ7FiYCWYmhpMjWFupdMAq2BN', 'E8QEnkMMyWWrHPTbA7jo547SpkoGcE6yoTXHmrQeXY2sGnT', 'FAtJupteW5urNYVQvUcLaw2X9xtdwjumK2gvJpuBnAwFHvq', 'GTzRQPzkcuynHgkEHhsPBFpKdh4sAacVRsnd8vYfPpTMeEY', 'FX7rJbfiTFCqBuCWHLgR8SosDyZh842nv79mdQF4vxnZrhS', 'DrkY92Yq67zJ7T8XWN7SAXbnNDJhzkADutwhhhPyW3tQKTw', 'GfYXsuFn8MVensbKc6gKjPpxXMNh1LzcrBn4BfhNMgK1zKH', 'Fk6p456PTU6Sju2b83Cy8rU3NGFsXmWk9BrcqaMqhWW1jWf', 'FagAVsTYT8QghxypUtLcfnmnnhPhPpf854UNuptpQKuNndK', 'DokiayXWoMvotzchNdLSH4P4Fe7EvMESZvZL4Fn3NekoFtf', 'DTMCVLVqNj5L3kpuftg49bY9xozwhRyF52sEHdBySbpbPkt', 'FD3A8DXs16wGvcoi9stjpwz2pmxXFymTkVyVM4Tq5z6LWCK', 'EFjHdypk8xLf3ocDEFPaKFWVcfamH8mpvfUeXHvRWpSBk2M', 'Eo9RxTKq2WppUvRRycUmLFHJvHtBVoxURhDe78ZKmjoJfWN', 'Faa8iXWy2wxo7ryLEhGCNeb55d8rnVy9SN25NiCmmqP6QMV', 'CdEm1ErGKML3waXabLvn3NyqdAGXBQJVngLaM86YM5Yb9dr', 'Et5ne6GRrWZ178npoYdnG8RRU92gzqBiSRf4hTaU3Yonsf2', 'GbpLB9AZwVBBfecbMoTv3HCVb6irwN6y5YeA7uDNoUuRFrL', 'EyibGsAttxpNBkgjMxNTArskxkdEFFbwghYuuaZyvu9rmo2', 'H9R6HgnZKtrcfBJP2M6WCvLJvp72Q96eURbCxmj6KCFVWjh', 'HyTJYoYwA8GGgDH2XVnUhsPgMq7nnnE4Qq2BdwmpdHNzSdo', 'FSETB7JeTuTsJBYzUcKBtHXBYtBft3pZ87FUxP2GaY4acFh', 'Eo4boG437k7gFy75VqPrWP5gHSGi9Sm6CZzLFFsCGYaSPzM', 'HeeJfizAEvorbkinL4GfRUYpxUiFST3dpnUHrh9ga2Z8Cpm', 'D3JqthKZjAEge84RQ3dheuQmaX2nVhk9A3sHY1rGNbStiFg', 'FChhpqk6Er57sXMC71F2aQ7EsNBQZTe3wUGXfKEvLH7W8zE', 'F7Nnn8nQL3Bjxap8Ax1HDZcXdqXZxtqBgn5VXqx8bLhZh8N', 'EonK7NScfhd7ZRfgnLhm4cKRFJWK1z59zPximUZRg8VjHQj', 'FPRN9EfcCTswkRXfrkwoouep8uhVJRvMy1hnhB4Hb73biwK', 'FFdDXFK1VKG5QgjvqwxdVjo8hGrBveaBFfHnWyz1MAmLL82', 'FiHWU9AjN7z2no8zyiVEXtiTE46izxDgEcF1KM4r2r1GK59', 'F8DXBsUQrvVvL9AvkEqxykmy1AWcBcn2CqjG3nyzYRFVJeS', 'DrQHiQu5VkaRuv1H3iELXVqsvD3SV3E8xNjJqXUgECSg23R', 'GptHKfncW4Xwif6ohcZx6apt4B7jU7Pugvw1usQygP8WWQ7', 'FhmaBgRFjZYFUWJp91ZHUbuW2Dm32VH4BVhnRQJqfpMmEok', 'DiCVHECatzBxCKZeCmQhvqbAo9KK6CHubAWtQF85N3YbKFW', 'DKinge6g7FNNj3hJZJUze6GByxkLR7ipCqrnuSQKGRMg37G', 'GCiTn1UJQT9TE5iamqoKweVoWGRZr9DF8uKXL4cG98fXczf', 'EviBmmkq5o5ak2jUo71SPuDEdwGTr8Yz8U5tXBgF6fy8kKV', 'Cwr82cUKvfgnQSnLeN84CmtNaUGjYBD2qaBjsTxG43ZNh2M', 'GZ5xCKCC8JRpJSMgAoDJAFAuQV8gD9Xz2cJca4mR7oRhzL9', 'DbAdiLJQDFzLyaLsoFCzrpBLuaBXXqQKdpewUSxqiWJadmp', 'DKUQiUWNPGvGYrgaxWqduJVRqWUYXUeKprX9EJENhxYvVyS', 'F2GF2vuTCCmx8PnUNpWHTd5hTzjdbufa2uxdq2uT7PC5s9k', 'Cs1jHXYHxZyWKsGPvYY1BknhLdpNa1iXGja4Kn8hQZs7BsH'];
    const vs1 = validators1.map((v) => v.toString());
    const vs2 = validators2.map((v) => v.toString());

    expect(expectedValidators1).toEqual(vs1);
    expect(expectedValidators2).toEqual(vs2);
  });

  it('support http provider', async () => {
    const apiService = await prepareApiService(HTTP_ENDPOINT);
    const api = apiService.getApi();
    const blockhash = await api.rpc.chain.getBlockHash(1);
    const patchedApi = await apiService.getPatchedApi(blockhash);
    await expect(patchedApi.query.system.events()).resolves.toHaveLength(2);
  });
});
