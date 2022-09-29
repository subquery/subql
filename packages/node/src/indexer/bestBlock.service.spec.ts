// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SignedBlock } from '@polkadot/types/interfaces';
import { ApiService } from './api.service';
import { BestBlockService } from './bestBlock.service';

function mockApiService(): ApiService {
  const mockApi = {
    consts: {
      babe: {
        epochDuration: 0x0000000000000960,
        expectedBlockTime: 0x0000000000001770,
        maxAuthorities: 0x000186a0,
      },
      timestamp: {
        minimumPeriod: 0x0000000000000bb8,
      },
    },
    query: {
      parachainSystem: undefined,
    },
    rpc: {
      state: {
        getRuntimeVersion: jest.fn(() => {
          return {
            specVersion: {
              toNumber: jest.fn(() => 12),
            },
          };
        }),
      },
      chain: {
        getFinalizedHead: jest.fn(() => `0x112344`),
        getBlock: jest.fn(() => {
          return {
            block: {
              header: {
                number: {
                  toNumber: jest.fn(() => {
                    return 256;
                  }),
                },
              },
            },
          };
        }),
        getBlockHash: jest.fn(() => {
          return {
            toHex: jest.fn(() => '0x123456'),
          };
        }),
      },
    },
    on: jest.fn(),
    runtimeChain: {
      toString: jest.fn(() => `Polkadot`),
    },
    runtimeVersion: {
      specName: {
        toString: jest.fn(() => `polkadot`),
      },
    },
    genesisHash: {
      toString: jest.fn(() => `0x12345`),
    },
  };
  return {
    getApi: () => mockApi,
  } as any;
}

describe('BestBlockService', () => {
  let apiService: ApiService;
  let bestBlockService: BestBlockService;

  beforeEach(() => {
    apiService = mockApiService();
    bestBlockService = new BestBlockService(apiService);
  });

  afterEach(() => {
    (bestBlockService as unknown as any).bestBlocks = {};
  });

  it('can get closest block for finalized', () => {
    bestBlockService.storeBestBlock(100, '0x50abcd');
    bestBlockService.storeBestBlock(120, '0x50abcd');
    bestBlockService.storeBestBlock(50, '0x50abcd');
    bestBlockService.storeBestBlock(80, '0x50abcd');
    expect(bestBlockService.getClosestRecord(110).blockHeight).toBe(100);
    expect(bestBlockService.getClosestRecord(40)).toBeUndefined();
    expect(bestBlockService.getClosestRecord(120).blockHeight).toBe(120);
    expect(bestBlockService.getClosestRecord(150).blockHeight).toBe(120);
  });

  it('can remove bestBlock less equal than finalized', () => {
    bestBlockService.storeBestBlock(50, '0x50abcd');
    bestBlockService.storeBestBlock(80, '0x80abcd');
    bestBlockService.storeBestBlock(100, '0x100abc');
    bestBlockService.storeBestBlock(120, '0x120abc');
    // bestBlockService.registerFinalizedBlock({block:{header:{toNumber: 110}}} as unknown as SignedBlock)
    bestBlockService.removeFinalized(90);
    expect((bestBlockService as any).bestBlocks[100]).toBeDefined();
    expect((bestBlockService as any).bestBlocks[80]).toBeUndefined();
    expect((bestBlockService as any).bestBlocks[50]).toBeUndefined();
    bestBlockService.removeFinalized(150);
    expect((bestBlockService as any).bestBlocks[100]).toBeUndefined();
    expect((bestBlockService as any).bestBlocks[120]).toBeUndefined();

    // bestBlockService.getClosestRecord()
  });

  it('can validate best block if finalized block can be found in its record', async () => {
    bestBlockService.storeBestBlock(50, '0x50abcd');
    bestBlockService.storeBestBlock(80, '0x80abcd');
    bestBlockService.storeBestBlock(100, '0x100abc');
    bestBlockService.storeBestBlock(120, '0x120abc');
    bestBlockService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 100 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    await expect(bestBlockService.validateBestBlocks()).resolves.toBeTruthy();
    bestBlockService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 120 } } },
      hash: { toHex: () => '0x120xyz' },
    } as unknown as SignedBlock);
    await expect(bestBlockService.validateBestBlocks()).resolves.toBeFalsy();
    // bestBlockService.getClosestRecord()
  });

  it('can validate best block if finalized block can NOT be found in its record', async () => {
    bestBlockService.storeBestBlock(50, '0x50abcd');
    bestBlockService.storeBestBlock(80, '0x80abcd');
    bestBlockService.storeBestBlock(100, '0x100abc');
    bestBlockService.storeBestBlock(120, '0x123456');
    bestBlockService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 150 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    await expect(bestBlockService.validateBestBlocks()).resolves.toBeTruthy();
  });

  it('and invalid best block will be remove', async () => {
    bestBlockService.storeBestBlock(100, '0x100abc');
    bestBlockService.storeBestBlock(120, '0x120abc');
    bestBlockService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 150 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    // blockHash mocked value is `0x123456`
    await expect(bestBlockService.validateBestBlocks()).resolves.toBeFalsy();
    expect(bestBlockService.bestBlock(120)).toBeUndefined();
  });

  it('get last correct best block', async () => {
    bestBlockService.storeBestBlock(30, '0x50abcd');
    bestBlockService.storeBestBlock(40, '0x123456');
    bestBlockService.storeBestBlock(50, '0x50abcd');
    bestBlockService.storeBestBlock(80, '0x80abcd');
    bestBlockService.storeBestBlock(90, '0x80abcd');
    bestBlockService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 80 } } },
      hash: { toHex: () => '0x10abcd' },
    } as unknown as SignedBlock);
    await expect(bestBlockService.getLastCorrectBestBlock()).resolves.toBe(40);
  });
});
