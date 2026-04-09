// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseCustomDataSource, BaseDataSource} from '@subql/types-core';
import {IApi} from '../api.service';
import {IBlockchainService} from '../blockchain.service';
import {NodeConfig} from '../configure';
import {ProcessBlockResponse} from './blockDispatcher';
import {DsProcessorService} from './ds-processor.service';
import {DatasourceParams, DynamicDsService} from './dynamic-ds.service';
import {BaseIndexerManager, FilterTypeMap, HandlerInputTypeMap, ProcessorTypeMap} from './indexer.manager';
import {IndexerSandbox} from './sandbox';
import {CacheMetadataModel} from './storeModelProvider';
import {IBlock, ISubqueryProject} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

type FM = FilterTypeMap<BaseDataSource>;
type PM = ProcessorTypeMap<BaseDataSource, FM>;
type HIM = HandlerInputTypeMap<BaseDataSource, FM>;

// Minimal sandbox mock that lets us grab the frozen destroy callback
class MockSandbox {
  // eslint-disable-next-line @typescript-eslint/ban-types
  frozenFns: Record<string, Function> = {};

  freeze(value: any, name: string): void {
    if (typeof value === 'function') {
      this.frozenFns[name] = value;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async securedExec(): Promise<void> {}
}

class TestIndexerManager extends BaseIndexerManager<
  any,
  any,
  any,
  IApi,
  BaseDataSource,
  BaseDataSource & BaseCustomDataSource,
  FM,
  PM,
  HIM
> {
  processedStartBlocks: number[] = [];
  destroyConfig?: {triggerStartBlock: number; targetTemplate: string; targetIndex: number};

  async indexBlock(block: IBlock<any>, datasources: BaseDataSource[]): Promise<ProcessBlockResponse> {
    return this.internalIndexBlock(block, datasources, () => Promise.resolve({} as any));
  }

  // Simulates what chain-specific indexBlockData does: iterate dataSources, call getVM, run handlers
  protected async indexBlockData(
    _block: any,
    dataSources: BaseDataSource[],
    getVM: (d: BaseDataSource) => Promise<IndexerSandbox>
  ): Promise<void> {
    for (let i = 0; i < dataSources.length; i++) {
      const ds = dataSources[i];
      this.processedStartBlocks.push(ds.startBlock!);

      const vm = (await getVM(ds)) as unknown as MockSandbox;

      // Trigger destroy if this ds matches the config
      if (this.destroyConfig && ds.startBlock === this.destroyConfig.triggerStartBlock) {
        const destroyFn = vm.frozenFns.destroyDynamicDatasource;
        if (destroyFn) {
          await destroyFn(this.destroyConfig.targetTemplate, this.destroyConfig.targetIndex);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async prepareFilteredData<T>(_kind: any, data: T): Promise<T> {
    return data;
  }
}

class TestDynamicDsService extends DynamicDsService<BaseDataSource, ISubqueryProject> {
  constructor(project: ISubqueryProject) {
    super(project, {
      updateDynamicDs: () => Promise.resolve(undefined),
    } as unknown as IBlockchainService);
  }
}

const mockMetadata = (initData: DatasourceParams[] = []) => {
  let datasourceParams: DatasourceParams[] = initData;

  return {
    set: (_key: string, value: any) => {
      datasourceParams = value;
    },
    find: (_key: string) => Promise.resolve([...datasourceParams]),
    setNewDynamicDatasource: (params: DatasourceParams) => datasourceParams.push(params),
  } as unknown as CacheMetadataModel;
};

const mockBlock = (height: number): IBlock<any> => ({
  getHeader: () => ({blockHeight: height, blockHash: `hash-${height}`, parentHash: undefined, timestamp: new Date()}),
  block: {},
});

describe('BaseIndexerManager', () => {
  let dynamicDsService: TestDynamicDsService;
  let manager: TestIndexerManager;

  const project = {
    templates: [{name: 'Test'}, {name: 'Other'}],
  } as any as ISubqueryProject;

  beforeEach(() => {
    dynamicDsService = new TestDynamicDsService(project);

    manager = new TestIndexerManager(
      {unsafeApi: {}} as unknown as IApi,
      {unfinalizedBlocks: false, profiler: false} as unknown as NodeConfig,
      {getDsProcessor: () => new MockSandbox()} as any,
      {} as DsProcessorService<BaseDataSource, BaseDataSource & BaseCustomDataSource>,
      dynamicDsService as any,
      {processUnfinalizedBlocks: () => Promise.resolve(undefined)} as unknown as IUnfinalizedBlocksService<any>,
      {} as FM,
      {} as PM,
      {isRuntimeDs: () => true, isCustomDs: () => false} as unknown as IBlockchainService
    );
  });

  describe('destroy dynamic datasource mid-block', () => {
    it('removes destroyed ds from the iteration within the same block', async () => {
      const meta = mockMetadata([
        {templateName: 'Test', startBlock: 1},
        {templateName: 'Test', startBlock: 5},
        {templateName: 'Test', startBlock: 10},
      ]);
      await dynamicDsService.init(meta);
      const datasources = await dynamicDsService.getDynamicDatasources();

      // When processing startBlock=5, destroy ds at index 2 (startBlock=10)
      manager.destroyConfig = {triggerStartBlock: 5, targetTemplate: 'Test', targetIndex: 2};

      await manager.indexBlock(mockBlock(100), datasources);

      // startBlock=10 should never be reached
      expect(manager.processedStartBlocks).toEqual([1, 5]);
    });

    it('sets endBlock on the destroyed datasource', async () => {
      const meta = mockMetadata([
        {templateName: 'Test', startBlock: 1},
        {templateName: 'Test', startBlock: 5},
      ]);
      await dynamicDsService.init(meta);
      const datasources = await dynamicDsService.getDynamicDatasources();

      manager.destroyConfig = {triggerStartBlock: 1, targetTemplate: 'Test', targetIndex: 1};

      await manager.indexBlock(mockBlock(50), datasources);

      const param = dynamicDsService.getDatasourceParamByIndex(1);
      expect(param?.endBlock).toBe(50);
    });

    it('processes all datasources when nothing is destroyed', async () => {
      const meta = mockMetadata([
        {templateName: 'Test', startBlock: 1},
        {templateName: 'Test', startBlock: 5},
        {templateName: 'Test', startBlock: 10},
      ]);
      await dynamicDsService.init(meta);
      const datasources = await dynamicDsService.getDynamicDatasources();

      await manager.indexBlock(mockBlock(100), datasources);

      expect(manager.processedStartBlocks).toEqual([1, 5, 10]);
    });

    it('filters out already-destroyed datasources before processing starts', async () => {
      const meta = mockMetadata([
        {templateName: 'Test', startBlock: 1, endBlock: 50},
        {templateName: 'Test', startBlock: 5},
        {templateName: 'Test', startBlock: 10},
      ]);
      await dynamicDsService.init(meta);
      const datasources = await dynamicDsService.getDynamicDatasources();

      await manager.indexBlock(mockBlock(100), datasources);

      // startBlock=1 was destroyed at block 50, should be excluded
      expect(manager.processedStartBlocks).toEqual([5, 10]);
    });
  });
});
