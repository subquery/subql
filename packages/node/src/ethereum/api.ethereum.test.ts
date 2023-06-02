// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { EthereumApi } from './api.ethereum';
import { EthereumBlockWrapped } from './block.ethereum';

// Add api key to work
const HTTP_ENDPOINT = 'https://eth.api.onfinality.io/public';

const ds: SubqlRuntimeDatasource = {
  mapping: {
    file: '',
    handlers: [
      {
        handler: 'test',
        kind: EthereumHandlerKind.Call,
        filter: { function: '0x23b872dd' },
      },
    ],
  },
  kind: EthereumDatasourceKind.Runtime,
  startBlock: 16258633,
  options: { abi: 'erc721' },
  assets: {
    erc721: { file: path.join(__dirname, '../../test/erc721.json') },
  } as unknown as Map<string, { file: string }>,
};

jest.setTimeout(90000);
describe('Api.ethereum', () => {
  let ethApi: EthereumApi;
  const eventEmitter = new EventEmitter2();
  let blockData: EthereumBlockWrapped;
  beforeAll(async () => {
    ethApi = new EthereumApi(HTTP_ENDPOINT, eventEmitter);
    await ethApi.init();
    blockData = await ethApi.fetchBlock(16258633, true);
  });

  it('Decode nested logs in transactions', async () => {
    // Erc721
    const tx = blockData.transactions.find(
      (e) =>
        e.hash ===
        '0x8e419d0e36d7f9c099a001fded516bd168edd9d27b4aec2bcd56ba3b3b955ccc',
    );
    const parsedTx = await ethApi.parseTransaction(tx, ds);
    expect(parsedTx.logs[0].args).toBeTruthy();
  });

  it('Should return raw logs, if decode fails', async () => {
    // not Erc721
    const tx = blockData.transactions.find(
      (e) =>
        e.hash ===
        '0xed62f7a7720fe6ae05dec45ad9dd4f53034a0aae2c140d229b1151504ee9a6c9',
    );
    const parsedLog = await ethApi.parseLog(tx.logs[0], ds);
    expect(parsedLog).not.toHaveProperty('args');
    expect(parsedLog).toBeTruthy();
  });
});
