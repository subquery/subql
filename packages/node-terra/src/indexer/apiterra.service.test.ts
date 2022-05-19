// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { GraphQLSchema } from 'graphql';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryTerraProject } from '../configure/terraproject.model';
import { ApiTerraService } from './apiterra.service';

const ENDPOINT = 'https://terra-columbus-5.beta.api.onfinality.io';
const CHAIN_ID = 'columbus-5';
const MANTLEMINT =
  'https://mantlemint.terra-columbus-5.beta.api.onfinality.io:1320';

const TEST_TXHASH =
  'CuYHCvcFCjIvdGVycmEub3JhY2xlLnYxYmV0YTEuTXNnQWdncmVnYXRlRXhjaGFuZ2VSYXRlVm90ZRLABQoEMDI4ZBLUBDc4LjM3ODk4NjQyNjQyMzc4MDc1NHVhdWQsNzEuMjk0MDU0NDY2ODc5OTgwMjI5dWNhZCw1MS44NjYyODY2MDgzMTk4NDUyNDN1Y2hmLDM1NS4zNDUxNzk5ODI4NzgwMTAwNjV1Y255LDM2Ny42NjcxMTAyNjAzMzgyMTg5MjJ1ZGtrLDQ5LjQwMDI2Mzk3MzMzODY5MTIyNnVldXIsNDEuMzg5NDg3NjEwMzQ4MTM3NzQ4dWdicCw0MzcuMjc1MDM5NDc1NDkwMzYzNTc3dWhrZCw4MDA0MTAuNjc0MTA5OTk5MzI5OTM3Njg3dWlkciw0MjE3LjE5MzUxNDMxNDc4NDY4NDY5NXVpbnIsNjQ4My44MjY2MjU4ODU1NDM4MDgxMjR1anB5LDY3MDc4LjczOTIwNzc2NTE2NTczNTc4MnVrcncsMTYwMjI5LjYwNDMwOTQ5NjExNzEwOTc5NXVtbnQsMjM0Ljc4MjIzNjI3OTczMDU0MDc5NnVteXIsNDk5LjUzNTA2MzA2Nzk4NTE5MjA2N3Vub2ssMjg3My44MjM5NDI3NTUzNDU2MTQ2M3VwaHAsNDAuMDMwMzk4MDIwMjI4ODYyMjI0dXNkciw1MjAuNjk1NjQzNTMxNTA3MDgzODgydXNlayw3NS40MjI0OTQzNjk4OTM5NTMzODZ1c2dkLDE4MTcuMTYzNzYxMzg5NjEzNjM5NDY4dXRoYiwxNTYxLjU5Mzg4Mjk5OTgwNDc5ODczdXR3ZCw1Ni4wNDcyNDI3Nzc4MTY2MzI1ODR1dXNkGix0ZXJyYTF6bHBzMm04ZWFhZ3lyMmd5a2Y0NWtxc3Z0eGpqdmZzbDZoYWZ6cyIzdGVycmF2YWxvcGVyMTZ0YzNjOXU2eWo1dXVocnUzMnB2czBwYWhmd3JhdXJweXB6N3ZqCscBCjUvdGVycmEub3JhY2xlLnYxYmV0YTEuTXNnQWdncmVnYXRlRXhjaGFuZ2VSYXRlUHJldm90ZRKNAQooOGNjMmQwYTJiODQxZmJkODgwYmY2YTcyZjA0MTc0YjhmYzIyZGFkZhIsdGVycmExemxwczJtOGVhYWd5cjJneWtmNDVrcXN2dHhqanZmc2w2aGFmenMaM3RlcnJhdmFsb3BlcjE2dGMzYzl1NnlqNXV1aHJ1MzJwdnMwcGFoZndyYXVycHlwejd2ahIgQHRlcnJhLW1vbmV5L29yYWNsZS1mZWVkZXJAMi4wLjASWgpSCkYKHy9jb3Ntb3MuY3J5cHRvLnNlY3AyNTZrMS5QdWJLZXkSIwohA8J+5FGfUpmwLqfjxp9lwx1K09ZeSLrUCSySIXFlBoHoEgQKAggBGNmjTRIEEPCTCRpAP/zQ4bvQHhUbc9vg0rnLCDplpjVOPNj4nATLPn1jPzJ8VVCEc7VxPDQzMGyfIkZYUKWERC36LD4qNmyqRBLaEg==';
const TEST_BLOCKNUMBER = 6500000;

function testTerraProject(): SubqueryTerraProject {
  return {
    network: {
      endpoint: ENDPOINT,
      chainId: CHAIN_ID,
      mantlemint: MANTLEMINT,
    },
    dataSources: [],
    id: 'test',
    root: './',
    schema: new GraphQLSchema({}),
    templates: [],
  };
}

jest.setTimeout(200000);

describe.skip('ApiTerraSevice', () => {
  let app: INestApplication;
  let apiService: ApiTerraService;

  const prepareApiService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: SubqueryTerraProject,
          useFactory: () => testTerraProject(),
        },
        ApiTerraService,
        NodeConfig,
      ],
      imports: [EventEmitterModule.forRoot()],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    apiService = app.get(ApiTerraService);
    await apiService.init();
  };

  beforeAll(async () => {
    await prepareApiService();
  });

  it('query tx info', async () => {
    const api = apiService.getApi();
    const txInfoLcd = await api.txInfo(TEST_TXHASH);
    const txs = await api.txsByHeightMantlemint(TEST_BLOCKNUMBER.toString());
    expect(txInfoLcd).toMatchObject(txs[0]);
  });

  it('query block info', async () => {
    const api = apiService.getApi();
    const blockInfoLcd = await api.blockInfo(TEST_BLOCKNUMBER);
    const blockInfoMantlemint = await api.blockInfoMantlemint(TEST_BLOCKNUMBER);
    expect(blockInfoLcd).toMatchObject(blockInfoMantlemint);
  });
});
