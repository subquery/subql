// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { BlockchainService } from './blockchain.service';
import { StellarApi, StellarApiService } from './stellar';
import { SorobanServer } from './stellar/soroban.server';

const HTTP_ENDPOINT = 'https://horizon-futurenet.stellar.org';
const SOROBAN_ENDPOINT = 'https://rpc-futurenet.stellar.org';

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    const apiService = {
      api: new StellarApi(HTTP_ENDPOINT, new SorobanServer(SOROBAN_ENDPOINT)),
    } as StellarApiService;

    blockchainService = new BlockchainService(apiService);
  });

  it('correctly calculates block timestamp', async () => {
    //https://stellar.expert/explorer/testnet/ledger/1453893
    const timestamp = await blockchainService.getBlockTimestamp(1453893);

    expect(timestamp.toISOString()).toBe('2024-05-05T04:17:35.000Z');
  });

  it('correctly gets the header for a height', async () => {
    const header = await blockchainService.getHeaderForHeight(1453893);

    expect(header).toEqual({
      blockHeight: 1453893,
      blockHash: '1453893',
      parentHash: '1453892',
      timestamp: new Date('2024-05-05T04:17:35.000Z'),
    });
  });
});
