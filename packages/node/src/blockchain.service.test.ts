// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlockchainService } from './blockchain.service';
import { EthereumApi, EthereumApiService } from './ethereum';

const HTTP_ENDPOINT = 'https://ethereum.rpc.subquery.network/public';

const mockApiService = (): EthereumApiService => {
  const ethApi = new EthereumApi(HTTP_ENDPOINT, 20, new EventEmitter2());

  // await ethApi.init();

  return {
    unsafeApi: ethApi,
  } as any;
};

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;

  beforeEach(() => {
    const apiService = mockApiService();

    blockchainService = new BlockchainService(apiService);
  });

  it('can get a block timestamps', async () => {
    const timestamp = await blockchainService.getBlockTimestamp(4_000_000);

    expect(timestamp).toEqual(new Date('2017-07-09T20:52:47.000Z'));
  });
});
