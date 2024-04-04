// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {BaseDataSource, BaseHandler, BaseMapping, DictionaryQueryEntry, IProjectNetworkConfig} from '@subql/types-core';
import {range} from 'lodash';
import {BlockDispatcher, delay, IBlockDispatcher, IProjectService, NodeConfig} from '../';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {DictionaryService} from './dictionary/dictionary.service';
import {BaseFetchService} from './fetch.service';

const CHAIN_INTERVAL = 100; // 100ms
const genesisHash = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

class TestFetchService extends BaseFetchService<BaseDataSource, IBlockDispatcher<any>, any> {
  finalizedHeight = 1000;
  bestHeight = 20;

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

  protected async initBlockDispatcher(): Promise<void> {
    return Promise.resolve();
  }
  async preLoopHook(data: {startHeight: number}): Promise<void> {
    return Promise.resolve();
  }

  protected getModulos(dataSources: BaseDataSource[]): number[] {
    // This is mocks get modulos, checkes every handler
    const modulos: number[] = [];
    for (const ds of dataSources) {
      for (const handler of ds.mapping.handlers) {
        if (handler.filter && handler.filter.modulo) {
          modulos.push(handler.filter.modulo);
        }
      }
    }

    return modulos;
  }
}

const nodeConfig = new NodeConfig({
  subquery: '',
  batchSize: 10,
  unfinalizedBlocks: false,
  networkDictionary: [''],
});

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

function mockModuloDs(startBlock: number, endBlock: number, modulo: number): BaseDataSource {
  return {
    kind: 'mock/DataSource',
    startBlock: startBlock,
    endBlock: endBlock,
    mapping: {
      file: '',
      handlers: [
        {
          kind: 'mock/Handler',
          handler: 'mockFunction',
          filter: {modulo: modulo},
        },
      ],
    },
  };
}

const getDictionaryService = () =>
  ({
    useDictionary: () => {
      return false;
    },
    findDictionary: () => {
      /* TODO*/
    },
    buildDictionaryEntryMap: () => {
      /* TODO*/
    },
    initValidation: () => {
      /* TODO */
    },
    scopedDictionaryEntries: () => {
      /* TODO */
    },
    initDictionaries: () => {
      /* TODO */
    },
  } as any as DictionaryService<any, any>);

const getBlockDispatcher = () => {
  const inst = {
    latestBufferedHeight: 0,
    smartBatchSize: 10,
    minimumHeapLimit: 1000,
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
  let blockDispatcher: IBlockDispatcher<any>;
  let dictionaryService: DictionaryService<any, any>;
  let networkConfig: IProjectNetworkConfig;
  let dataSources: BaseDataSource[];

  beforeEach(() => {
    dataSources = [mockDs];

    const eventEmitter = new EventEmitter2();
    const schedulerRegistry = new SchedulerRegistry();

    const projectService = {
      getStartBlockFromDataSources: jest.fn(() => Math.min(...dataSources.map((ds) => ds.startBlock ?? 0))),
      getAllDataSources: jest.fn(() => dataSources),
      getDataSourcesMap: jest.fn(() => {
        // XXX this doesn't consider end blocks
        const x = new Map();
        dataSources.map((ds, idx, dss) => {
          x.set(
            ds.startBlock ?? 0,
            dss.filter((d) => (d.startBlock ?? 0) <= (ds.startBlock ?? 0))
          );
        });
        return new BlockHeightMap(x);
      }),
    } as any as IProjectService<any>;

    blockDispatcher = getBlockDispatcher();
    dictionaryService = getDictionaryService();
    networkConfig = getNetworkConfig();

    fetchService = new TestFetchService(
      nodeConfig,
      projectService,
      networkConfig,
      blockDispatcher,
      dictionaryService,
      eventEmitter,
      schedulerRegistry
    );
  });

  const enableDictionary = () => {
    // Mock the remainder of dictionary service so it works
    (dictionaryService as any).useDictionary = () => jest.fn(() => true);
    // dictionaryService.queriesMap = new BlockHeightMap(new Map([[1, [{entity: 'mock', conditions: []}]]]));
    (dictionaryService as any).getDictionary = () =>
      jest.fn(() => {
        return {
          queryMapValidByHeight: () => true,
          startHeight: 1,
          getQueryEndBlock: () => 1000,
        };
      });
    dictionaryService.scopedDictionaryEntries = (start, end, batch) => {
      return Promise.resolve({
        batchBlocks: [2, 4, 6, 8, 10],
        queryEndBlock: end,
        _metadata: {
          lastProcessedHeight: 1000,
        } as any,

        lastBufferedHeight: 1000,
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
    (fetchService as any).projectService.getDataSourcesMap = jest.fn(
      () =>
        new BlockHeightMap(
          new Map([
            [
              1,
              [
                {...mockDs, startBlock: 1, endBlock: 300},
                {...mockDs, startBlock: 1, endBlock: 100},
              ],
            ],
            [
              10,
              [
                {...mockDs, startBlock: 1, endBlock: 300},
                {...mockDs, startBlock: 1, endBlock: 100},
                {...mockDs, startBlock: 10, endBlock: 20},
              ],
            ],
            [
              21,
              [
                {...mockDs, startBlock: 1, endBlock: 300},
                {...mockDs, startBlock: 1, endBlock: 100},
              ],
            ],
            [
              50,
              [
                {...mockDs, startBlock: 1, endBlock: 300},
                {...mockDs, startBlock: 1, endBlock: 100},
                {...mockDs, startBlock: 50, endBlock: 200},
              ],
            ],
            [
              101,
              [
                {...mockDs, startBlock: 1, endBlock: 300},
                {...mockDs, startBlock: 50, endBlock: 200},
              ],
            ],
            [201, [{...mockDs, startBlock: 1, endBlock: 300}]],
            [301, []],
            [500, [{...mockDs, startBlock: 500}]],
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

    await expect(fetchService.getFinalizedHeight()).resolves.toBe(fetchService.finalizedHeight);
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
    expect((fetchService as any).useDictionary).toBeTruthy();
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');
    await fetchService.init(1);
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([2, 4, 6, 8, 10], 10);
    expect(dictionarySpy).toHaveBeenCalled();
  });

  it('skips the dictionary', async () => {
    enableDictionary();
    (dictionaryService as any).useDictionary = jest.fn(() => false);

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    const dictionarySpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

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
        lastBufferedHeight: 1000,
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
    (fetchService as any).getModulos = () => [3];

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);
    expect((fetchService as any).useDictionary).toBeFalsy();
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([3, 6, 9, 12, 15, 18, 21, 24, 27, 30], 30);
  });

  it('enqueues modulo blocks WITH dictionary', async () => {
    (fetchService as any).getModulos = () => [3];
    enableDictionary();

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeTruthy();
    // This should include dictionary results interleaved with modulo blocks
    // [2, 4, 6, 8, 10] + [3, 6, 9, 12, 15, 18]. 18 is included because there is a duplicate of 6
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([2, 3, 4, 6, 8, 9, 10, 12, 15, 18], 18);
  });

  it('can check should useModuloHandlersOnly', () => {
    dataSources = [
      {
        kind: 'mock/DataSource',
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              kind: 'mock/Handler',
              handler: 'mockFunction',
              filter: {
                modulo: 150,
              },
            },
          ],
        },
      },
    ];
    // 1 modulo handler only
    expect((fetchService as any).useModuloHandlersOnly(dataSources)).toBeTruthy();
    dataSources[0].mapping.handlers.push({
      kind: 'mock/Handler',
      handler: 'mockFunction',
      filter: {},
    });
    // 2 handlers, only 1 has modulo filter
    expect((fetchService as any).useModuloHandlersOnly(dataSources)).toBeFalsy();
  });

  it('can exclude modulo blocks', () => {
    (fetchService as any).projectService.getDataSourcesMap = jest.fn(
      () =>
        new BlockHeightMap(
          new Map([
            [1, [{...mockModuloDs(1, 100, 20), startBlock: 1, endBlock: 100}]],
            [
              101, // empty gap for discontinuous block
              [],
            ],
            [201, [{...mockModuloDs(201, 500, 30), startBlock: 201, endBlock: 500}]],
            // to infinite
            [500, [{...mockModuloDs(500, Number.MAX_SAFE_INTEGER, 99), startBlock: 500}]],
            // multiple ds
            [
              600,
              [
                {...mockModuloDs(500, 800, 99), startBlock: 600, endBlock: 800},
                {...mockModuloDs(700, Number.MAX_SAFE_INTEGER, 101), startBlock: 700},
              ],
            ],
          ])
        )
    );

    const numbers = (fetchService as any).getModuloBlocks(1, 300);
    expect(numbers).toEqual([20, 40, 60, 80, 100]);

    const numbers2 = (fetchService as any).getModuloBlocks(105, 10000);
    expect(numbers2).toEqual([]);

    const numbers3 = (fetchService as any).getModuloBlocks(250, 10000);
    expect(numbers3).toEqual([270, 300, 330, 360, 390, 420, 450, 480]);

    // ds with no endHeight, end before next blockHeight key
    const numbers4 = (fetchService as any).getModuloBlocks(500, 10000);
    expect(numbers4).toEqual([594]);

    //handle multiple ds modulo
    const numbers5 = (fetchService as any).getModuloBlocks(600, 1000);
    expect(numbers5).toEqual([606, 693, 707, 792, 808, 891, 909, 990]);
  });

  it('update the LatestBufferHeight when modulo blocks full synced', async () => {
    (fetchService as any).getModulos = () => [20];
    fetchService.finalizedHeight = 55;

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    // simulate we have synced to block 50, and modulo is 20, next block to handle suppose be 60,80,100...
    // we will still enqueue 55 to update LatestBufferHeight
    await fetchService.init(50);
    expect(enqueueBlocksSpy).toHaveBeenLastCalledWith([], 55);
  });

  it('enqueues modulo blocks correctly', async () => {
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    (fetchService as any).getModulos = () => [150];

    dataSources = [
      {
        kind: 'mock/DataSource',
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              kind: 'mock/Handler',
              handler: 'mockFunction',
              filter: {},
            },
            {
              kind: 'mock/Handler',
              handler: 'mockFunction',
              filter: {
                modulo: 150,
              },
            },
          ],
        },
      },
    ];

    await fetchService.init(2);

    expect(enqueueBlocksSpy).toHaveBeenLastCalledWith([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 11);
  });

  it('when enqueue ds endHeight less than modulo height, should not include any modulo', async () => {
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    dataSources = [
      {
        kind: 'mock/DataSource',
        startBlock: 1,
        endBlock: 9,
        mapping: {
          file: '',
          handlers: [
            {
              kind: 'mock/Handler',
              handler: 'mockFunction',
              filter: {},
            },
          ],
        },
      },
      {
        kind: 'mock/DataSource',
        startBlock: 10,
        mapping: {
          file: '',
          handlers: [
            {
              kind: 'mock/Handler',
              handler: 'mockFunction',
              filter: {
                modulo: 150,
              },
            },
          ],
        },
      },
    ];
    // First ds not found modulo will enqueue block until next ds startHeight -1, so it is 9 here
    await fetchService.init(2);
    expect(enqueueBlocksSpy).toHaveBeenLastCalledWith([2, 3, 4, 5, 6, 7, 8, 9], 9);
  });

  it('enqueues modulo blocks with furture dataSources', async () => {
    (fetchService as any).getModulos = () => [3];
    dataSources.push({...mockDs, startBlock: 20});

    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');

    await fetchService.init(1);

    expect((fetchService as any).useDictionary).toBeFalsy();
    // This should include dictionary results interleaved with modulo blocks
    // [2, 4, 6, 8, 10] + [3, 6, 9, 12, 15, 18]. 18 is included because there is a duplicate of 6
    expect(enqueueBlocksSpy).toHaveBeenCalledWith([3, 6, 9, 12, 15, 18], 18);
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
    (fetchService as any).getModulos = () => [50];
    enableDictionary();
    // Increase free size to be greater than batch size
    blockDispatcher.freeSize = 20;

    // Return results the size of the batch but less than end
    dictionaryService.scopedDictionaryEntries = (start, end, batch) => {
      const blocks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      return Promise.resolve({
        batchBlocks: blocks,
        lastBufferedHeight: blocks[blocks.length - 1],
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
    // change query end
    (dictionaryService as any).getDictionary(1).getQueryEndBlock = () => 10;

    const dictSpy = jest.spyOn(dictionaryService, 'scopedDictionaryEntries');

    await fetchService.init(1);

    expect(dictSpy).toHaveBeenCalledWith(1, FINALIZED_HEIGHT, 10);
  });

  it('throws if the start block is greater than the chain latest height', async () => {
    await expect(() => fetchService.init(1001)).rejects.toThrow(
      `The startBlock of dataSources in your project manifest (1001) is higher than the current chain height (1000). Please adjust your startBlock to be less that the current chain height.`
    );
  });

  it('should use enqueueSequential if use dictionary fetch failed', async () => {
    enableDictionary();
    (fetchService as any).dictionaryService.scopedDictionaryEntries = () => {
      throw new Error('Mock dictionary fetch failed');
    };
    const spyOnEnqueueSequential = jest.spyOn(fetchService as any, 'enqueueSequential');
    const enqueueBlocksSpy = jest.spyOn(blockDispatcher, 'enqueueBlocks');
    await fetchService.init(10);
    expect(spyOnEnqueueSequential).toHaveBeenCalledTimes(1);

    expect(enqueueBlocksSpy).toHaveBeenLastCalledWith([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 19);
  });
});
