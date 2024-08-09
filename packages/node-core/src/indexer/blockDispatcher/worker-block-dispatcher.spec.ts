// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {IBlockchainService} from '../../blockchain.service';
import {IProjectUpgradeService, NodeConfig} from '../../configure';
import {ConnectionPoolStateManager} from '../connectionPoolState.manager';
import {DynamicDsService} from '../dynamic-ds.service';
import {InMemoryCacheService} from '../inMemoryCache.service';
import {PoiSyncService} from '../poi';
import {StoreService} from '../store.service';
import {StoreCacheService} from '../storeCache';
import {IProjectService, ISubqueryProject} from '../types';
import {UnfinalizedBlocksService} from '../unfinalizedBlocks.service';
import {WorkerBlockDispatcher} from './worker-block-dispatcher';

class TestWorkerBlockDispatcher extends WorkerBlockDispatcher<any, any, any, any> {
  async fetchBlock(worker: any, height: number): Promise<void> {
    return Promise.resolve();
  }

  get minimumHeapLimit(): number {
    return 150;
  }
}
describe('WorkerBlockDispatcher', () => {
  let dispatcher: WorkerBlockDispatcher<any, any, any, any>;

  // Mock workers
  const mockWorkers = [
    {getMemoryLeft: jest.fn().mockResolvedValue(100), waitForWorkerBatchSize: jest.fn().mockResolvedValue(undefined)},
    {getMemoryLeft: jest.fn().mockResolvedValue(200), waitForWorkerBatchSize: jest.fn().mockResolvedValue(undefined)},
    {getMemoryLeft: jest.fn().mockResolvedValue(300), waitForWorkerBatchSize: jest.fn().mockResolvedValue(undefined)},
  ];

  beforeEach(() => {
    dispatcher = new TestWorkerBlockDispatcher(
      {workers: 3} as unknown as NodeConfig,
      null as unknown as EventEmitter2,
      null as unknown as IProjectService<any>,
      null as unknown as IProjectUpgradeService,
      null as unknown as StoreService,
      null as unknown as StoreCacheService,
      null as unknown as InMemoryCacheService,
      null as unknown as PoiSyncService,
      null as unknown as DynamicDsService,
      null as unknown as UnfinalizedBlocksService<any>,
      null as unknown as ConnectionPoolStateManager<any>,
      null as unknown as ISubqueryProject,
      null as unknown as IBlockchainService<any>,
      '',
      []
    );
    (dispatcher as any).workers = mockWorkers;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getNextWorkerIndex should return the index of the next worker that has memory above the minimum limit', async () => {
    const index = await (dispatcher as any).getNextWorkerIndex();
    expect(index).toBe(1);
  });

  test('getNextWorkerIndex should skip workers that have memory below the minimum limit', async () => {
    // Make the first worker return memory below the limit
    mockWorkers[1].getMemoryLeft.mockResolvedValue(100);

    const index = await (dispatcher as any).getNextWorkerIndex();
    expect(index).toBe(2);
  });

  test('getNextWorkerIndex should wait for memory to be freed if all workers have memory below the minimum limit', async () => {
    // Make all workers return memory below the limit
    mockWorkers[0].getMemoryLeft.mockResolvedValue(100);
    mockWorkers[1].getMemoryLeft.mockResolvedValue(100);
    mockWorkers[2].getMemoryLeft.mockResolvedValue(100);

    // Make the first worker free up memory after waiting
    mockWorkers[0].waitForWorkerBatchSize.mockImplementationOnce(() => {
      mockWorkers[0].getMemoryLeft.mockResolvedValue(200);
      return Promise.resolve();
    });

    const index = await (dispatcher as any).getNextWorkerIndex();
    expect(index).toBe(0);
  });
});
