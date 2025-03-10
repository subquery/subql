// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { IBlockchainService } from '../blockchain.service';
import { Header, IBlock } from '../indexer';
import { StoreCacheService, CacheMetadataModel } from './storeModelProvider';
import {
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  UnfinalizedBlocksService,
} from './unfinalizedBlocks.service';

/* Notes:
 * Block hashes all have the format '0xabc' + block number
 * If they are forked they will have an `f` at the end
 */
const BlockchainService = {
  async getFinalizedHeader(): Promise<Header> {
    return Promise.resolve({
      blockHeight: 91,
      blockHash: `0xabc91f`,
      parentHash: `0xabc90f`,
      timestamp: new Date(),
    });
  },
  async getHeaderForHash(hash: string): Promise<Header> {
    const num = Number(hash.toString().replace('0xabc', '').replace('f', ''));
    return Promise.resolve({
      blockHeight: num,
      blockHash: hash,
      parentHash: `0xabc${num - 1}f`,
      timestamp: new Date(),
    });
  },
  async getHeaderForHeight(height: number): Promise<Header> {
    return Promise.resolve({
      blockHeight: height,
      blockHash: `0xabc${height}f`,
      parentHash: `0xabc${height - 1}f`,
      timestamp: new Date(),
    });
  },
} as IBlockchainService;

function getMockMetadata(): any {
  const data: Record<string, any> = {};
  return {
    upsert: ({ key, value }: any) => (data[key] = value),
    findOne: ({ where: { key } }: any) => ({ value: data[key] }),
    findByPk: (key: string) => data[key],
    find: (key: string) => data[key],
  } as any;
}

function mockStoreCache(): StoreCacheService {
  return {
    metadata: new CacheMetadataModel(getMockMetadata(), 'height'),
  } as StoreCacheService;
}

function mockBlock(height: number, hash: string, parentHash?: string): IBlock<any> {
  return {
    getHeader: () => {
      return { blockHeight: height, parentHash: parentHash ?? '', blockHash: hash, timestamp: new Date() };
    },
    block: {
      header: {
        blockHeight: height,
        blockHash: hash,
        parentHash: parentHash ?? '',
      },
    },
  };
}

describe('UnfinalizedBlocksService', () => {
  let unfinalizedBlocksService: UnfinalizedBlocksService;

  beforeEach(async () => {
    unfinalizedBlocksService = new UnfinalizedBlocksService(
      { unfinalizedBlocks: true } as any,
      mockStoreCache(),
      BlockchainService
    );

    await unfinalizedBlocksService.init(() => Promise.resolve());
  });

  afterEach(() => {
    (unfinalizedBlocksService as unknown as any)._unfinalizedBlocks = {};
  });

  it('can set finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('cant set a lower finalized block', () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(99, '0x1234').block.header);

    expect((unfinalizedBlocksService as any).finalizedBlockNumber).toBe(110);
  });

  it('keeps track of unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toMatchObject([
      mockBlock(111, '0xabc111').block.header,
      mockBlock(112, '0xabc112').block.header,
    ]);
  });

  it('doesnt keep track of finalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(120, '0xabc120').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([]);
  });

  it('can process unfinalized blocks', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(112, '0xabc112', '0xabc111').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toMatchObject([
      mockBlock(113, '0xabc113').block.header,
    ]);
  });

  it('can handle a fork and rewind to the last finalized height', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(112, '0xabc112f', '0xabc111').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc111', blockHeight: 111, parentHash: '' });

    // After this the call stack is something like:
    // indexerManager -> blockDispatcher -> project -> project -> reindex -> blockDispatcher.resetUnfinalizedBlocks
    await unfinalizedBlocksService.resetUnfinalizedBlocks();

    expect((unfinalizedBlocksService as any).unfinalizedBlocks).toEqual([]);
  });

  it('can handle a fork when some unfinalized blocks are invalid', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(114, '0xabc114'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(115, '0xabc115'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(116, '0xabc116'));

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(113, '0xabc113f', '0xabc112').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(117, '0xabc117'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc112', blockHeight: 112, parentHash: '' });
  });

  it('can handle a fork when all unfinalized blocks are invalid', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(111, '0xabc111f', '0xabc110').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc110f', blockHeight: 110, parentHash: '0xabc109f' });
  });

  it('can handle a fork and when unfinalized blocks < finalized head', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(120, '0xabc120f', '0xabc119f').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc110f', blockHeight: 110, parentHash: '0xabc109f' });
  });

  it('can handle a fork and when unfinalized blocks < finalized head 2', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block);

    (unfinalizedBlocksService as any).lastCheckedBlockHeight = 110;

    await (unfinalizedBlocksService as any).registerUnfinalizedBlock(
      mockBlock(111, '0xabc111', null as any).block.header
    );
    await (unfinalizedBlocksService as any).registerUnfinalizedBlock(
      mockBlock(112, '0xabc112', null as any).block.header
    );

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(120, '0xabc120f', '0xabc119f').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc110f', blockHeight: 110, parentHash: '0xabc109f' });
  });

  it('can handle a fork and when unfinalized blocks < finalized head with a large difference', async () => {
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(110, '0xabcd').block.header);

    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(111, '0xabc111'));
    await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(112, '0xabc112'));

    // Forked block
    unfinalizedBlocksService.registerFinalizedBlock(mockBlock(1200, '0xabc1200f', '0xabc1199f').block.header);

    const res = await unfinalizedBlocksService.processUnfinalizedBlocks(mockBlock(113, '0xabc113'));

    // Last valid block
    expect(res).toMatchObject({ blockHash: '0xabc110f', blockHeight: 110, parentHash: '0xabc109f' });
  });

  it('can rewind any unfinalized blocks when restarted and unfinalized blocks is disabled', async () => {
    const storeCache = new StoreCacheService(null as any, { storeCacheThreshold: 300 } as any, new EventEmitter2());

    storeCache.init('height', {} as any, undefined);

    await storeCache.metadata.set(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(<Header[]>[
        { blockHeight: 90, blockHash: '0xabcd' },
        { blockHeight: 91, blockHash: '0xabc91' },
        { blockHeight: 92, blockHash: '0xabc92' },
      ])
    );
    await storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, 90);
    const unfinalizedBlocksService2 = new UnfinalizedBlocksService(
      { unfinalizedBlocks: false } as any,
      storeCache,
      BlockchainService
    );

    const reindex = jest.fn().mockReturnValue(Promise.resolve());

    await unfinalizedBlocksService2.init(reindex);

    expect(reindex).toHaveBeenCalledWith(
      expect.objectContaining({ blockHash: '0xabc90f', blockHeight: 90, parentHash: '0xabc89f' })
    );
    expect((unfinalizedBlocksService2 as any).lastCheckedBlockHeight).toBe(90);
  });
});
