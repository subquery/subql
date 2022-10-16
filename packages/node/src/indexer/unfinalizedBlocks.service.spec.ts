// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SignedBlock } from '@polkadot/types/interfaces';
import { ApiService } from './api.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

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

describe('UnfinalizedBlocksService', () => {
  let apiService: ApiService;
  let unfinalizedBlocksService: UnfinalizedBlocksService;

  beforeEach(() => {
    apiService = mockApiService();
    unfinalizedBlocksService = new UnfinalizedBlocksService(apiService);
  });

  afterEach(() => {
    (unfinalizedBlocksService as unknown as any).unfinalizedBlocks = {};
  });

  it('can get closest block for finalized', () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(100, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(120, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(50, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(80, '0x50abcd');
    expect(unfinalizedBlocksService.getClosestRecord(110).blockHeight).toBe(
      100,
    );
    expect(unfinalizedBlocksService.getClosestRecord(40)).toBeUndefined();
    expect(unfinalizedBlocksService.getClosestRecord(120).blockHeight).toBe(
      120,
    );
    expect(unfinalizedBlocksService.getClosestRecord(150).blockHeight).toBe(
      120,
    );
  });

  it('can remove bestBlock less equal than finalized', () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(50, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(80, '0x80abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(100, '0x100abc');
    unfinalizedBlocksService.storeUnfinalizedBlock(120, '0x120abc');
    // unfinalizedBlocksService.registerFinalizedBlock({block:{header:{toNumber: 110}}} as unknown as SignedBlock)
    unfinalizedBlocksService.removeFinalized(90);
    expect((unfinalizedBlocksService as any).bestBlocks[100]).toBeDefined();
    expect((unfinalizedBlocksService as any).bestBlocks[80]).toBeUndefined();
    expect((unfinalizedBlocksService as any).bestBlocks[50]).toBeUndefined();
    unfinalizedBlocksService.removeFinalized(150);
    expect((unfinalizedBlocksService as any).bestBlocks[100]).toBeUndefined();
    expect((unfinalizedBlocksService as any).bestBlocks[120]).toBeUndefined();

    // unfinalizedBlocksService.getClosestRecord()
  });

  it('can validate best block if finalized block can be found in its record', async () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(50, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(80, '0x80abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(100, '0x100abc');
    unfinalizedBlocksService.storeUnfinalizedBlock(120, '0x120abc');
    unfinalizedBlocksService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 100 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    await expect(
      unfinalizedBlocksService.validateBestBlocks(),
    ).resolves.toBeTruthy();
    unfinalizedBlocksService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 120 } } },
      hash: { toHex: () => '0x120xyz' },
    } as unknown as SignedBlock);
    await expect(
      unfinalizedBlocksService.validateBestBlocks(),
    ).resolves.toBeFalsy();
    // unfinalizedBlocksService.getClosestRecord()
  });

  it('can validate best block if finalized block can NOT be found in its record', async () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(50, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(80, '0x80abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(100, '0x100abc');
    unfinalizedBlocksService.storeUnfinalizedBlock(120, '0x123456');
    unfinalizedBlocksService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 150 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    await expect(
      unfinalizedBlocksService.validateBestBlocks(),
    ).resolves.toBeTruthy();
  });

  it('and invalid best block will be remove', async () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(100, '0x100abc');
    unfinalizedBlocksService.storeUnfinalizedBlock(120, '0x120abc');
    unfinalizedBlocksService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 150 } } },
      hash: { toHex: () => '0x100abc' },
    } as unknown as SignedBlock);
    // blockHash mocked value is `0x123456`
    await expect(
      unfinalizedBlocksService.validateBestBlocks(),
    ).resolves.toBeFalsy();
    expect(unfinalizedBlocksService.unfinalizedBlock(120)).toBeUndefined();
  });

  it('get last correct best block', async () => {
    unfinalizedBlocksService.storeUnfinalizedBlock(30, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(40, '0x123456');
    unfinalizedBlocksService.storeUnfinalizedBlock(50, '0x50abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(80, '0x80abcd');
    unfinalizedBlocksService.storeUnfinalizedBlock(90, '0x80abcd');
    unfinalizedBlocksService.registerFinalizedBlock({
      block: { header: { number: { toNumber: () => 80 } } },
      hash: { toHex: () => '0x10abcd' },
    } as unknown as SignedBlock);
    await expect(
      unfinalizedBlocksService.getLastCorrectBestBlock(),
    ).resolves.toBe(40);
  });
});
