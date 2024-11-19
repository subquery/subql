// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConnectionPoolService,
  ConnectionPoolStateManager,
  NodeConfig,
} from '@subql/node-core';
import { BlockchainService } from './blockchain.service';
import { ApiService } from './indexer/api.service';

const POLKADOT_ENDPOINT = 'https://rpc.polkadot.io';

describe('BlockchainService', () => {
  let blockchainService: BlockchainService;
  let apiService: ApiService;

  beforeAll(async () => {
    const nodeConfig = new NodeConfig({} as any);

    apiService = await ApiService.create(
      {
        network: {
          endpoint: { [POLKADOT_ENDPOINT]: {} },
          chainId:
            '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
        },
        dataSources: [],
        templates: [],
      } as any,
      new ConnectionPoolService(nodeConfig, new ConnectionPoolStateManager()),
      new EventEmitter2(),
      nodeConfig,
    );

    blockchainService = new BlockchainService(apiService, null as any) as any;
  }, 10000);

  afterAll(async () => {
    await apiService.onApplicationShutdown();
  });

  it('can get the finalized height', async () => {
    const header = await blockchainService.getFinalizedHeader();
    expect(header.blockHeight).toBeGreaterThan(0);
  });

  it('can get the best height', async () => {
    const height = await blockchainService.getBestHeight();
    expect(height).toBeGreaterThan(0);
  });

  it('can get the chain interval', async () => {
    const interval = await blockchainService.getChainInterval();
    expect(interval).toEqual(5000);
  });
});
