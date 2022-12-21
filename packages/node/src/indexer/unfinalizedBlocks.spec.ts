// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Block } from '@ethersproject/abstract-provider';
import { MetadataRepo, ApiService } from '@subql/node-core';
import { EthereumBlock } from '@subql/types-ethereum';
import {
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

/* Notes:
 * Block hashes all have the format '0xabc' + block number
 * If they are forked they will have an `f` at the end
 */

function mockApiService(): ApiService {
  const mockApi = {
    getFinalizedBlockHeight: jest.fn(() => 110),
    getRuntimeChain: jest.fn(() => 'ethereum'),
    getBlockByHeightOrHash: (heightOrHash: string | number): Block => {
      if (typeof heightOrHash === 'string') {
        const height = Number(
          heightOrHash.toString().replace('0xabc', '').replace('f', ''),
        );

        return {
          number: height,
          hash: heightOrHash,
          parentHash: `0xabc${height - 1}f`,
        } as unknown as Block;
      } else {
        const hash = `0xabc${heightOrHash}f`;
        return {
          number: heightOrHash,
          hash: hash,
          parentHash: `0xabc${heightOrHash - 1}f`,
        } as unknown as Block;
      }
    },
  };
  return {
    api: mockApi,
  } as any;
}

function getMockMetadata(): MetadataRepo {
  const data: Record<string, any> = {};
  return {
    upsert: ({ key, value }) => (data[key] = value),
    findOne: ({ where: { key } }) => ({ value: data[key] }),
  } as any;
}

function mockBlock(
  height: number,
  hash: string,
  parentHash?: string,
): EthereumBlock {
  return {
    number: height,
    hash: hash,
    parentHash: parentHash,
  } as unknown as EthereumBlock;
}

describe('UnfinalizedBlocksService', () => {
  let apiService: ApiService;
  let unfinalizedBlocksService: UnfinalizedBlocksService;

  beforeEach(() => {
    apiService = mockApiService();
    unfinalizedBlocksService = new UnfinalizedBlocksService(
      apiService,
      { unfinalizedBlocks: true } as any,
      null,
    );

    unfinalizedBlocksService.init(getMockMetadata(), () => Promise.resolve());
  });

  afterEach(() => {
    (unfinalizedBlocksService as unknown as any).unfinalizedBlocks = {};
  });

  it('can set finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
    );

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('cant set a lower finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
    );

    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(99),
    );

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('keeps track of unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([
      [111, '0xabc111'],
      [112, '0xabc112'],
    ]);
  });

  it('doesnt keep track of finalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(120),
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(111, '0xabc111'),
      null,
    );
    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(112, '0xabc112'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([]);
  });

  it('can process unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(112, '0xabc112', '0xabc111') as unknown as Block,
    );

    await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([
      [113, '0xabc113'],
    ]);
  });

  it('can handle a fork and rewind to the last finalized height', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(112, '0xabc112f', '0xabc111') as unknown as Block,
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

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([]);
  });

  it('can handle a fork when some unfinalized blocks are invalid', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(113, '0xabc113f', '0xabc112') as unknown as Block,
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
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(111, '0xabc111f', '0xabc110') as unknown as Block,
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
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(120, '0xabc120f', '0xabc119f') as unknown as Block,
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(110);
  });

  it('can handle a fork and when unfinalized blocks < finalized head 2', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(
      apiService.api.getBlockByHeightOrHash(110),
    );

    (unfinalizedBlocksService as any).lastCheckedBlockHeight = 110;

    await (unfinalizedBlocksService as any).registerUnfinalizedBlock(
      111,
      '0xabc111',
      null,
    );
    await (unfinalizedBlocksService as any).registerUnfinalizedBlock(
      112,
      '0xabc112',
      null,
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(
      mockBlock(120, '0xabc120f', '0xabc119f') as unknown as Block,
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
      apiService.api.getBlockByHeightOrHash(110),
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
      mockBlock(1200, '0xabc1200f', '0xabc1199f') as unknown as Block,
    );

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(
      mockBlock(113, '0xabc113'),
      null,
    );

    // Last valid block
    expect(res).toBe(110);
  });

  it('can rewind any unfinalized blocks when restarted and unfinalized blocks is disabled', async () => {
    const metadata = getMockMetadata();

    metadata.upsert({
      key: METADATA_UNFINALIZED_BLOCKS_KEY,
      value: JSON.stringify([
        [90, '0xabcd'],
        [91, '0xabc91'],
        [92, '0xabc92'],
      ]),
    });

    metadata.upsert({
      key: METADATA_LAST_FINALIZED_PROCESSED_KEY,
      value: 90,
    });

    const unfinalizedBlocksService2 = new UnfinalizedBlocksService(
      apiService,
      { unfinalizedBlocks: false } as any,
      {
        transaction: () => Promise.resolve({ commit: () => undefined }),
      } as any,
    );

    const reindex = jest.fn().mockReturnValue(Promise.resolve());

    await unfinalizedBlocksService2.init(metadata, reindex);

    expect(reindex).toBeCalledWith(90);
    expect((unfinalizedBlocksService2 as any).lastCheckedBlockHeight).toBe(90);
  });
});
