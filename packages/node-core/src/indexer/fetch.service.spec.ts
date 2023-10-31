// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {BaseDataSource, BaseHandler, BaseMapping, DictionaryQueryEntry, IProjectNetworkConfig} from '@subql/types-core';
import {range} from 'lodash';
import {
  BlockDispatcher,
  delay,
  DictionaryService,
  DynamicDsService,
  IBlockDispatcher,
  IProjectService,
  NodeConfig,
} from '..';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {BaseFetchService} from './fetch.service';

const CHAIN_INTERVAL = 100; // 100ms
const genesisHash = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

class TestFetchService extends BaseFetchService<BaseDataSource, IBlockDispatcher, DictionaryService> {
  finalizedHeight = 1000;
  bestHeight = 20;
  modulos: number[] = [];

  protected buildDictionaryQueryEntries(
    dataSources: BaseDataSource<BaseHandler<any>, BaseMapping<BaseHandler<any>>>[]
  ): DictionaryQueryEntry[] {
    return [];
  }
  getGenesisHash(): string {
    return genesisHash;
  }
  async getFinalizedHeight(): Promise<number> {
    return Promise.resolve(this.finalizedHeight);
  }
  async getBestHeight(): Promise<number> {
    return Promise.resolve(this.bestHeight);
  }
  protected async getChainInterval(): Promise<number> {
    return Promise.resolve(CHAIN_INTERVAL);
  }
  protected getModulos(): number[] {
    return this.modulos;
  }
  protected async initBlockDispatcher(): Promise<void> {
    return Promise.resolve();
  }
  async preLoopHook(data: {startHeight: number}): Promise<void> {
    return Promise.resolve();
  }
}

const nodeConfig = {
  batchSize: 10,
  unfinalizedBlocks: false,
  dictionary: '',
  dictionaryResolver: '',
} as any as NodeConfig;

const getNetworkConfig = () =>
  ({
    dictionary: 'https://example.com',
  } as IProjectNetworkConfig);

const mockDs: BaseDataSource = {
  kind: 'mock/DataSource',
  startBlock: 1,
  mapping: {
    file: '',
    handlers: [
      {
        kind: 'mock/Handler',
        handler: 'mockFunction',
      },
    ],
  },
};

const projectService = {
  getStartBlockFromDataSources: jest.fn(() => mockDs.startBlock),
  getAllDataSources: jest.fn(() => [mockDs]),
} as any as IProjectService<any>;

const dynamicDsService = {
  deleteTempDsRecords: (height: number) => {
    /* Nothing */
  },
} as DynamicDsService<any>;

const getDictionaryService = () =>
  ({
    useDictionary: false,
    buildDictionaryEntryMap: () => {
      /* TODO*/
    },
    initValidation: () => {
      /* TODO */
    },
    startHeight: 0,
    scopedDictionaryEntries: () => {
      /* TODO */
    },
  } as any as DictionaryService);

const getBlockDispatcher = () => {
  const inst = {
    latestBufferedHeight: 0,
    smartBatchSize: 10,
    minimumHeapLimit: 1000, // TOOD
    freeSize: 10,
    enqueueBlocks: (heights: number[], latestBufferHeight: number) => {
      (inst as any).freeSize = inst.freeSize - heights.length;
      inst.latestBufferedHeight = heights.length ? heights[heights.length - 1] : latestBufferHeight;
    },
    flushQueue: (height: number) => {
      /* TODO */
    },
  } as BlockDispatcher<any, any>;

  return inst;
};

describe('Fetch Service', () => {
  let fetchService: TestFetchService;
  let blockDispatcher: IBlockDispatcher;
  let dictionaryService: DictionaryService;
  let networkConfig: IProjectNetworkConfig;

  beforeEach(() => {
    const eventEmitter = new EventEmitter2();
    const schedulerRegistry = new SchedulerRegistry();

    blockDispatcher = getBlockDispatcher();
    dictionaryService = getDictionaryService();
    networkConfig = getNetworkConfig();

    fetchService = new TestFetchService(
      nodeConfig,
      projectService,
      networkConfig,
      blockDispatcher,
      dictionaryService,
      dynamicDsService,
      eventEmitter,
      schedulerRegistry
    );

    (fetchService as any).projectService.getDataSourcesMap = jest.fn(
      () => new BlockHeightMap(new Map([[1, [mockDs, mockDs]]]))
    );
  });

  const enableDictionary = () => {
    // Mock the remainder of dictionary service so it works
    (dictionaryService as any).useDictionary = true;
    dictionaryService.queriesMap = new BlockHeightMap(new Map([[1, [{entity: 'mock', conditions: []}]]]));
    dictionaryService.scopedDictionaryEntries = (start, end, batch) => {
      return Promise.resolve({
        batchBlocks: [2, 4, 6, 8, 10],
        queryEndBlock: end,
        _metadata: {
          lastProcessedHeight: 1000,
        } as any,
      });
    };
  };

  afterEach(() => {
    fetchService.onApplicationShutdown();
  });

  it('calls the preHookLoop when init is called', async () => {
    const preHookLoopSpy = jest.spyOn(fetchService, 'preLoopHook');

    await fetchService.init(1);

    expect(preHookLoopSpy).toHaveBeenCalled();
  });

  it('adds bypassBlocks for empty datasources', async () => {
    (fetchService as any).projectService.getDataSourcesMap = jest.fn().mockReturnValueOnce(
      new BlockHeightMap(
        new Map([
          [
            1,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
            ],
          ],
          [
            10,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
              {startBlock: 10, endBlock: 20},
            ],
          ],
          [
            21,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
            ],
          ],
          [
            50,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 1, endBlock: 100},
              {startBlock: 50, endBlock: 200},
            ],
          ],
          [
            101,
            [
              {startBlock: 1, endBlock: 300},
              {startBlock: 50, endBlock: 200},
            ],
          ],
          [201, [{startBlock: 1, endBlock: 300}]],
          [301, []],
          [500, [{startBlock: 500}]],
        ])
      )
    );

    await fetchService.init(1);
    expect((fetchService as any).bypassBlocks).toEqual(range(301, 500));
  });

  it('checks chain heads at an interval', async () => {
    const finalizedSpy = jest.spyOn(fetchService, 'getFinalizedHeight');
    const bestSpy = jest.spyOn(fetchService, 'getBestHeight');

    await fetchService.init(1);

    // Initial calls within init
    expect(finalizedSpy).toHaveBeenCalledTimes(1);
    expect(bestSpy).toHaveBeenCalledTimes(1);

    await delay((CHAIN_INTERVAL / 1000) * 1.5); // Convert to seconds then half a block interval off

    expect(finalizedSpy).toHaveBeenCalledTimes(2);
    expect(bestSpy).toHaveBeenCalledTimes(2);

    expect(fetchService.getLatestFinalizedHeight()).toBe(fetchService.finalizedHeight);
  });

  it('enqueues blocks WITHOUT dictionary', async () => {
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeFalsy();
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10);
    expect(dictionarySpy).not.toHaveBeenCalled();
  });

  it('enqueues blocks WITH valid dictionary results', async () => {
    enableDictionary();

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeTruthy();
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([2, 4, 6, 8, 10], 10);
    expect(dictionarySpy).toHaveBeenCalled();
  });

  it('skips the dictionary if the start height is later', async () => {
    enableDictionary();
    (dictionaryService as any).startHeight = 100;

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeTruthy();
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10);
    expect(dictionarySpy).not.toHaveBeenCalled();
  });

  it('updates the last processed height if the dictionary result is empty', async () => {
    enableDictionary();
    dictionaryService.scopedDictionaryEntries = (start, end, batch) => {
      return Promise.resolve({
        batchBlocks: [],
        queryEndBlock: end,
        _metadata: {
          lastProcessedHeight: 1000,
        } as any,
      });
    };

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeTruthy();

    // Update the last processed height but not enqueue blocks
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([], 1000);

    // Wait and see that it has only called the dictionary once, it should stop using it after that
    await delay(2);
    expect(dictionarySpy).toHaveBeenCalledTimes(1);
  });

  it('waits for blockDispatcher to have capacity', async () => {
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    blockDispatcher.freeSize = 0;

    await fetchService.init(1);

    // Should not be called as there is capacity
    expect(enqueueBlocksSpy).not.toHaveBeenCalled();

    await delay(1);
    // Should still not be called but should be checking
    expect(enqueueBlocksSpy).not.toHaveBeenCalled();

    // Add free space and expect blocks to be enqueued
    blockDispatcher.freeSize = 10;

    // Loop waits 1s before checking for free space
    await delay(1);
    expect(enqueueBlocksSpy).toHaveBeenCalled();
  });

  it('enqueues modulo blocks WITHOUT dictionary', async () => {
    // Set modulos to every 3rd block. We only have 1 data source
    fetchService.modulos = [3];

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeFalsy();
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([3, 6, 9, 12, 15, 18, 21, 24, 27, 30], 30);
  });

  it('enqueues modulo blocks WITH dictionary', async () => {
    fetchService.modulos = [3];
    enableDictionary();

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeTruthy();
    // This should include dictionary results interleaved with modulo blocks
    // [2, 4, 6, 8, 10] + [3, 6, 9, 12, 15, 18]. 18 is included because there is a duplicate of 6
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([2, 3, 4, 6, 8, 9, 10, 12, 15, 18], 18);
  });

  it('update the LatestBufferHeight when modulo blocks full synced', async () => {
    fetchService.modulos = [20];
    fetchService.finalizedHeight = 55;

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    // simulate we have synced to block 50, and modulo is 20, next block to handle suppose be 60,80,100...
    // we will still enqueue 55 to update LatestBufferHeight
    await fetchService.init(50);
    expect(enqueueBlocksSpy).toHaveBeenLastCalledWith([], 55);
  });

  it('skips bypassBlocks', async () => {
    (fetchService as any).networkConfig.bypassBlocks = [3];

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeFalsy();
    // Note the batch size is smaller because we exclude from the initial batch size
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([1, 2, 4, 5, 6, 7, 8, 9, 10], 10);
  });

  it('transforms bypassBlocks', async () => {
    // Set a range so on init its transformed
    (fetchService as any).networkConfig.bypassBlocks = ['2-5'];

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    // This doesn't work as they get removed after that height is processed
    // expect((fetchService as any).bypassBlocks).toEqual([2, 3, 4, 5]);

    // Note the batch size is smaller because we exclude from the initial batch size
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([1, 6, 7, 8, 9, 10], 10);
  });

  it('dictionary page limited result and modulo block enqueues correct blocks', async () => {
    fetchService.modulos = [50];
    enableDictionary();
    // Increase free size to be greater than batch size
    blockDispatcher.freeSize = 20;

    // Return results the size of the batch but less than end
    dictionaryService.scopedDictionaryEntries = (start, end, batch) => {
      const blocks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(blocks.length).toEqual(batch);
      expect(blocks[blocks.length - 1]).toBeLessThan(end);

      return Promise.resolve({
        batchBlocks: blocks,
        queryEndBlock: end,
        _metadata: {
          lastProcessedHeight: 1000,
        } as any,
      });
    };

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    // Modulo blocks should not be added as we are within batch size
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10);
  });

  it('dictionary dictionary queries to be limited to target block height (finalized/latest depending on settings)', async () => {
    // Set finalized height behind dict results
    // This can happen when an RPC endpoint is behind the dictionary
    enableDictionary();

    const FINALIZED_HEIGHT = 10;

    fetchService.finalizedHeight = FINALIZED_HEIGHT;

    const dictSpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect(dictSpy).toHaveBeenCalledWith(1, FINALIZED_HEIGHT, 10);
  });
});
