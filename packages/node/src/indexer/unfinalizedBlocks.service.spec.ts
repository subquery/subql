// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Header } from '@polkadot/types/interfaces';
import { MetadataRepo } from '@subql/node-core';
import { SubstrateBlock } from '@subql/types';
import { ApiService } from './api.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

/* Notes:
 * Block hashes all have the format '0xabc' + block number
 * If they are forked they will have an `f` at the end
 */

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
        getBlockHash: (height: number) => {
          return {
            toHex: () => `0xabc${height}f`,
          };
        },
        getHeader: (hash: { toString: () => string }) => {
          const num = Number(
            hash.toString().replace('0xabc', '').replace('f', ''),
          );
          return mockBlock(num, hash.toString(), `0xabc${num - 1}f`).block
            .header;
        },
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

function getMockMetadata(): MetadataRepo {
  const data: Record<string, any> = {};
  return {
    upsert: ({ key, value }) => (data[key] = value),
  } as any;
}

function mockBlock(
  height: number,
  hash: string,
  parentHash?: string,
): SubstrateBlock {
  const hashType = {
    toHex: () => hash,
    toString: () => hash,
  };

  const parentHashType = parentHash
    ? {
        toHex: () => parentHash,
        toString: () => parentHash,
      }
    : undefined;
  return {
    hash: hashType,
    block: {
      header: {
        number: {
          toNumber: () => height,
        },
        hash: hashType,
        parentHash: parentHashType,
      },
    },
  } as unknown as SubstrateBlock;
}

function mockBlockHeader(
  height: number,
  hash: string,
  parentHash?: string,
): Header {
  return mockBlock(height, hash, parentHash).block.header;
}

describe('UnfinalizedBlocksService', () => {
  let apiService: ApiService;
  let unfinalizedBlocksService: UnfinalizedBlocksService;

  beforeEach(() => {
    apiService = mockApiService();
    unfinalizedBlocksService = new UnfinalizedBlocksService(apiService);

    unfinalizedBlocksService.init(getMockMetadata(), {}, 0);
  });

  afterEach(() => {
    (unfinalizedBlocksService as unknown as any).unfinalizedBlocks = {};
  });

  it('can set finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('cant set a lower finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(99, '0x1234'),
    );

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('keeps track of unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual({
      111: '0xabc111',
      112: '0xabc112',
    });
  });

  it('doesnt keep track of finalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(120, '0xabc120'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual({});
  });

  it('can process unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(112, '0xabc112', '0xabc111'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual({
      113: '0xabc113',
    });
  });

  it('can handle a fork and rewind to the last finalized height', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(112, '0xabc112f', '0xabc111'),
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(111);

    // After this the call stack is something like:
    // indexerManager -> blockDispatcher -> project -> project -> reindex -> blockDispatcher.resetUnfinalizedBlocks
    await unfinalizedBlocksService.resetUnfinalizedBlocks(null);

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual({});
  });

  it('can handle a fork when some unfinalized blocks are invalid', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(114, '0xabc114'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(115, '0xabc115'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(116, '0xabc116'),
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(113, '0xabc113f', '0xabc112'),
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(117, '0xabc117'),
      null,
    );

    // Last valid block
    expect(res).toBe(112);
  });

  it('can handle a fork when all unfinalized blocks are invalid', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(111, '0xabc111f', '0xabc110'),
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(110);
  });

  it('can handle a fork and when unfinalized blocks < finalized head', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(120, '0xabc120f', '0xabc119f'),
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(110);
  });

  it('can handle a fork and when unfinalized blocks < finalized head with a large difference', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(110, '0xabcd'),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlockHeader(1200, '0xabc1200f', '0xabc1199f'),
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(110);
  });
});
