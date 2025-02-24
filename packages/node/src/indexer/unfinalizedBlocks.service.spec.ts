// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { hexZeroPad } from '@ethersproject/bytes';
import {
  ApiService,
  CacheMetadataModel,
  Header,
  NodeConfig,
  PoiBlock,
  StoreCacheService,
  METADATA_UNFINALIZED_BLOCKS_KEY,
  METADATA_LAST_FINALIZED_PROCESSED_KEY,
} from '@subql/node-core';
import { EthereumNodeConfig } from '../configure/NodeConfig';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

// Adds 0 padding so we can convert to POI block
const hexify = (input: string) => hexZeroPad(input, 4);

// Mock 1740100000 is the timestamp of the genesis block
const genBlockTimestamp = (height: number) => (1740100000 + height) * 1000;
const genBlockDate = (height: number) => new Date(genBlockTimestamp(height));

const makeHeader = (height: number, finalized?: boolean): Header => ({
  blockHeight: height,
  blockHash: hexify(`0xABC${height}${finalized ? 'f' : ''}`),
  parentHash: hexify(`0xABC${height - 1}${finalized ? 'f' : ''}`),
  timestamp: genBlockDate(height),
});

const getMockApi = (): ApiService => {
  return {
    api: {
      getBlockByHeightOrHash: (hash: string | number) => {
        const num =
          typeof hash === 'number'
            ? hash
            : Number(
                hash
                  .toString()
                  .replace('0x', '')
                  .replace('ABC', '')
                  .replace('f', ''),
              );
        return Promise.resolve({
          number: num,
          hash: typeof hash === 'number' ? hexify(`0xABC${hash}f`) : hash,
          parentHash: hexify(`0xABC${num - 1}f`),
          timestamp: genBlockTimestamp(num) / 1000,
        });
      },
      getFinalizedBlock: jest.fn(() => ({
        number: 110,
        hash: '0xABC110f',
        parentHash: '0xABC109f',
        timestamp: genBlockTimestamp(110) / 1000,
      })),
    },
  } as any;
};

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
    metadata: new CacheMetadataModel(getMockMetadata()),
    poi: {
      getPoiBlocksBefore: jest.fn(() => [
        PoiBlock.create(99, hexify('0xABC99f'), new Uint8Array(), ''),
      ]),
    },
  } as any as StoreCacheService;
}

describe('UnfinalizedBlockService', () => {
  let unfinalizedBlocks: UnfinalizedBlocksService;
  let storeCache: StoreCacheService;

  beforeEach(() => {
    storeCache = mockStoreCache();

    unfinalizedBlocks = new UnfinalizedBlocksService(
      getMockApi(),
      new NodeConfig({
        unfinalizedBlocks: true,
        blockForkReindex: 1000,
      } as any) as EthereumNodeConfig,
      storeCache,
    );
  });

  it('handles a block fork', async () => {
    await unfinalizedBlocks.init(jest.fn());

    (unfinalizedBlocks as any)._unfinalizedBlocks = [
      makeHeader(100),
      makeHeader(101),
      makeHeader(102),
      makeHeader(103, true), // Where the fork started
      makeHeader(104),
      makeHeader(105),
      makeHeader(106),
      makeHeader(107),
      makeHeader(108),
      makeHeader(109),
      makeHeader(110),
    ];

    const rewind = await unfinalizedBlocks.processUnfinalizedBlockHeader(
      makeHeader(111, true),
    );

    expect(rewind?.blockHeight).toEqual(103);
  });

  it('uses POI blocks if there are not enough cached unfinalized blocks', async () => {
    await unfinalizedBlocks.init(jest.fn());

    (unfinalizedBlocks as any)._unfinalizedBlocks = [
      makeHeader(100),
      makeHeader(101),
      makeHeader(102),
      makeHeader(103),
      makeHeader(104),
      makeHeader(105),
      makeHeader(106),
      makeHeader(107),
      makeHeader(108),
      makeHeader(109),
      makeHeader(110),
    ];

    const spy = jest.spyOn(storeCache.poi as any, 'getPoiBlocksBefore');

    const rewind = await unfinalizedBlocks.processUnfinalizedBlockHeader(
      makeHeader(111, true),
    );

    expect(rewind?.blockHeight).toEqual(99);
    expect(spy).toHaveBeenCalled();
  });

  // The finalized block is after the cached unfinalized blocks, they should be rechecked
  it('startup, correctly checks for forks after cached unfinalized blocks', async () => {
    storeCache.metadata.set(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(<Header[]>[
        makeHeader(99, true),
        makeHeader(100),
        makeHeader(101),
      ]),
    );

    storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, 99);

    const rewind = jest.fn();

    await unfinalizedBlocks.init(rewind);

    // It should fall back to poi in this case
    expect(rewind).toHaveBeenCalledWith({
      blockHash: '0x00ABC99f',
      blockHeight: 99,
      parentHash: '0x00ABC98f',
      timestamp: genBlockDate(99),
    });
  });

  it('startup, correctly checks for forks within cached unfinalized blocks', async () => {
    storeCache.metadata.set(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(<Header[]>[
        makeHeader(110),
        makeHeader(111),
        makeHeader(112),
      ]),
    );

    storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, 109);

    const rewind = jest.fn();

    await unfinalizedBlocks.init(rewind);

    // It should fall back to poi in this case
    expect(rewind).toHaveBeenCalledWith({
      blockHash: '0x00ABC99f',
      blockHeight: 99,
      parentHash: '0x00ABC98f',
      timestamp: genBlockDate(99),
    });
  });

  it('doesnt throw if there are no unfinalized blocks on startup', async () => {
    storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, 109);

    await expect(unfinalizedBlocks.init(jest.fn())).resolves.not.toThrow();
  });

  it('rewinds using blockForkReindex value if poi is not enabled', async () => {
    // Do this to "disable" poi
    (storeCache as any).poi = null;

    storeCache.metadata.set(
      METADATA_UNFINALIZED_BLOCKS_KEY,
      JSON.stringify(<Header[]>[
        makeHeader(110),
        makeHeader(111),
        makeHeader(112),
      ]),
    );

    storeCache.metadata.set(METADATA_LAST_FINALIZED_PROCESSED_KEY, 109);

    const rewind = jest.fn();

    await unfinalizedBlocks.init(rewind);

    // It should fall back to poi in this case
    expect(rewind).toHaveBeenCalledWith({ blockHeight: 0 });
  });
});
