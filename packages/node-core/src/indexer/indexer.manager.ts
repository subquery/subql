// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {BaseCustomDataSource, BaseDataSource} from '@subql/common';
import {IApi} from '../api.service';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {profilerWrap} from '../profiler';
import {ProcessBlockResponse} from './blockDispatcher';
import {BaseDsProcessorService} from './ds-processor.service';
import {DynamicDsService} from './dynamic-ds.service';
import {IndexerSandbox} from './sandbox';
import {IIndexerManager} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

export type HandlerKinds = string[];
export type FilterTypeMap<DS extends BaseDataSource = BaseDataSource> = Record<
  string,
  (data: any, filter: any, ds: DS) => boolean
>;
export type ProcessorTypeMap<FM extends FilterTypeMap> = {[K in keyof FM]: (data: any) => boolean};
export type HandlerInputTypeMap<FM extends FilterTypeMap> = {[K in keyof FM]: any};

export interface CustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export abstract class BaseIndexerManager<
  SA, // Api Type
  A, // SafeApi Type
  B, // Block Type
  API extends IApi<A, SA, B>,
  DS extends BaseDataSource,
  CDS extends DS & BaseCustomDataSource, // Custom datasource
  FilterMap extends FilterTypeMap,
  ProcessorMap extends ProcessorTypeMap<FilterMap>,
  HandlerInputMap extends HandlerInputTypeMap<FilterMap>
> implements IIndexerManager<B, DS>
{
  abstract start(): Promise<void>;
  abstract indexBlock(block: B, datasources: DS[], ...args: any[]): Promise<ProcessBlockResponse>;
  abstract getBlockHeight(block: B): number;
  abstract getBlockHash(block: B): string;

  protected abstract isRuntimeDs(ds: DS): ds is DS;
  protected abstract isCustomDs(ds: DS): ds is CDS;

  // Uses asSecondLayerHandlerProcessor_1_0_0 in substrate to transfrom from v0.0.0 -> v1.0.0
  protected abstract updateCustomProcessor: (processor: any) => any;

  protected abstract indexBlockData(
    block: B,
    dataSources: DS[],
    getVM: (d: DS) => Promise<IndexerSandbox>
  ): Promise<void>;

  // This is used by Ethereum to parse logs and transaction data with ABIs
  protected abstract prepareFilteredData<T>(kind: keyof FilterMap, data: T, ds: DS): Promise<T>;

  constructor(
    protected readonly apiService: API,
    protected readonly nodeConfig: NodeConfig,
    private sandboxService: {getDsProcessor: (ds: DS, api: SA) => IndexerSandbox},
    private dsProcessorService: BaseDsProcessorService<DS, CDS>,
    private dynamicDsService: DynamicDsService<DS>,
    private unfinalizedBlocksService: IUnfinalizedBlocksService<B>,
    private filterMap: FilterMap,
    private processorMap: ProcessorMap
  ) {
    logger.info('indexer manager start');
  }

  protected async internalIndexBlock(
    block: B,
    dataSources: DS[],
    getApi: () => Promise<SA>
  ): Promise<ProcessBlockResponse> {
    let dynamicDsCreated = false;
    const blockHeight = this.getBlockHeight(block);

    const filteredDataSources = this.filterDataSources(blockHeight, dataSources);

    this.assertDataSources(filteredDataSources, blockHeight);

    let apiAt: SA;
    const reindexBlockHeight = (await this.processUnfinalizedBlocks(block)) ?? null;

    // Only index block if we're not going to reindex
    if (!reindexBlockHeight) {
      await this.indexBlockData(block, filteredDataSources, async (ds: DS) => {
        // Injected runtimeVersion from fetch service might be outdated
        apiAt = apiAt ?? (await getApi());

        const vm = this.sandboxService.getDsProcessor(ds, apiAt);

        // Inject function to create ds into vm
        vm.freeze(async (templateName: string, args?: Record<string, unknown>) => {
          const newDs = await this.dynamicDsService.createDynamicDatasource({
            templateName,
            args,
            startBlock: blockHeight,
          });
          // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
          filteredDataSources.push(newDs);
          dynamicDsCreated = true;
        }, 'createDynamicDatasource');

        return vm;
      });
    }

    return {
      dynamicDsCreated,
      blockHash: this.getBlockHash(block),
      reindexBlockHeight,
    };
  }

  protected async processUnfinalizedBlocks(block: B): Promise<number | undefined> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block);
    }
  }

  private filterDataSources(nextProcessingHeight: number, dataSources: DS[]): DS[] {
    let filteredDs: DS[];

    filteredDs = dataSources.filter((ds) => ds.startBlock !== undefined && ds.startBlock <= nextProcessingHeight);

    if (filteredDs.length === 0) {
      logger.error(`Did not find any matching datasouces`);
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (this.isCustomDs(ds)) {
        return this.dsProcessorService.getDsProcessor(ds).dsFilterProcessor(ds, this.apiService.unsafeApi);
      } else {
        return true;
      }
    });

    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private assertDataSources(ds: DS[], blockHeight: number) {
    if (!ds.length) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${blockHeight}
         or delete your database and start again from the currently specified startBlock`
      );
      process.exit(1);
    }
  }

  protected async indexData<K extends keyof FilterMap>(
    kind: K,
    data: HandlerInputMap[K],
    ds: DS,
    getVM: (ds: DS) => Promise<IndexerSandbox>
  ): Promise<void> {
    let vm: IndexerSandbox;
    assert(this.filterMap[kind], `Unsupported handler kind: ${kind.toString()}`);

    if (this.isRuntimeDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind && this.filterMap[kind](data as any, h.filter, ds)
      );

      for (const handler of handlers) {
        vm = vm! ?? (await getVM(ds));

        const parsedData = await this.prepareFilteredData(kind, data, ds);

        this.nodeConfig.profiler
          ? await profilerWrap(
              vm.securedExec.bind(vm),
              'handlerPerformance',
              handler.handler
            )(handler.handler, [parsedData])
          : await vm.securedExec(handler.handler, [parsedData]);
      }
    } else if (this.isCustomDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(ds, data, this.processorMap[kind], (data, baseFilter) => {
        return this.filterMap[kind](data, baseFilter, ds);
      });

      for (const handler of handlers) {
        vm = vm! ?? (await getVM(ds));
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends keyof FilterMap>(
    ds: CDS, //SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    data: HandlerInputMap[K],
    baseHandlerCheck: ProcessorMap[K],
    baseFilter: (data: HandlerInputMap[K], baseFilter: any) => boolean
  ): CustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers
      .filter((handler) => {
        const processor = plugin.handlerProcessors[handler.kind];
        if (baseHandlerCheck(processor)) {
          processor.baseFilter;
          return baseFilter(data, processor.baseFilter);
        }
        return false;
      })
      .filter((handler) => {
        const processor = this.updateCustomProcessor(plugin.handlerProcessors[handler.kind]);

        try {
          return processor.filterProcessor({
            filter: handler.filter,
            input: data,
            ds,
          });
        } catch (e: any) {
          logger.error(e, 'Failed to run ds processer filter.');
          throw e;
        }
      });
  }

  private async transformAndExecuteCustomDs<K extends keyof FilterMap>(
    ds: CDS, //SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    vm: IndexerSandbox,
    handler: CustomHandler,
    data: HandlerInputMap[K]
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processor = this.updateCustomProcessor(plugin.handlerProcessors[handler.kind]);

    const transformedData = await processor
      .transformer({
        input: data,
        ds,
        filter: handler.filter,
        api: this.apiService.unsafeApi,
        assets,
      })
      .catch((e: any) => {
        logger.error(e, 'Failed to transform data with ds processor.');
        throw e;
      });

    // We can not run this in parallel. the transformed data items may be dependent on one another.
    // An example of this is with Acala EVM packing multiple EVM logs into a single Substrate event
    for (const _data of transformedData) {
      await vm.securedExec(handler.handler, [_data]);
    }
  }
}
