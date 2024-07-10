// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {BaseCustomDataSource, BaseDataSource} from '@subql/types-core';
import {IApi} from '../api.service';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {exitWithError, monitorWrite} from '../process';
import {profilerWrap} from '../profiler';
import {handledStringify} from './../utils';
import {ProcessBlockResponse} from './blockDispatcher';
import {asSecondLayerHandlerProcessor_1_0_0, BaseDsProcessorService} from './ds-processor.service';
import {DynamicDsService} from './dynamic-ds.service';
import {IndexerSandbox} from './sandbox';
import {IBlock, IIndexerManager} from './types';
import {IUnfinalizedBlocksService} from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

export type HandlerKinds = string[];
export type FilterTypeMap<DS extends BaseDataSource = BaseDataSource> = Record<
  string,
  (data: any, filter: any, ds: DS) => boolean
>;
export type ProcessorTypeMap<DS extends BaseDataSource, FM extends FilterTypeMap<DS>> = {
  [K in keyof FM]: (data: any) => boolean;
};
export type HandlerInputTypeMap<DS extends BaseDataSource, FM extends FilterTypeMap<DS>> = {[K in keyof FM]: any};

export interface CustomHandler<K extends string = string, F = Record<string, unknown>> {
  handler: string;
  kind: K;
  filter?: F;
}

export abstract class BaseIndexerManager<
  A, // Api Type
  SA, // SafeApi Type
  B, // Block Type
  API extends IApi<A, SA, IBlock<B>[]>,
  DS extends BaseDataSource,
  CDS extends DS & BaseCustomDataSource, // Custom datasource
  FilterMap extends FilterTypeMap<DS>,
  ProcessorMap extends ProcessorTypeMap<DS, FilterMap>,
  HandlerInputMap extends HandlerInputTypeMap<DS, FilterMap>,
> implements IIndexerManager<B, DS>
{
  abstract indexBlock(block: IBlock<B>, datasources: DS[], ...args: any[]): Promise<ProcessBlockResponse>;

  protected abstract isRuntimeDs(ds: DS): ds is DS;
  protected abstract isCustomDs(ds: DS): ds is CDS;

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
    protected sandboxService: {getDsProcessor: (ds: DS, api: SA, unsafeApi: A) => IndexerSandbox},
    private dsProcessorService: BaseDsProcessorService<DS, CDS>,
    private dynamicDsService: DynamicDsService<DS>,
    private unfinalizedBlocksService: IUnfinalizedBlocksService<B>,
    private filterMap: FilterMap,
    private processorMap: ProcessorMap
  ) {
    logger.info('indexer manager start');
  }

  /**
   * This function can be overwritten to provide extra values to the sandbox
   * E.g Cosmos injecting the registry
   * */
  protected getDsProcessor(ds: DS, safeApi: SA): IndexerSandbox {
    return this.sandboxService.getDsProcessor(ds, safeApi, this.apiService.unsafeApi);
  }

  protected async internalIndexBlock(
    block: IBlock<B>,
    dataSources: DS[],
    getApi: () => Promise<SA>
  ): Promise<ProcessBlockResponse> {
    let dynamicDsCreated = false;
    const blockHeight = block.getHeader().blockHeight;
    monitorWrite(`- BlockHash: ${block.getHeader().blockHash}`);

    const filteredDataSources = this.filterDataSources(blockHeight, dataSources);

    this.assertDataSources(filteredDataSources, blockHeight);

    let apiAt: SA;
    const reindexBlockHeight = (await this.processUnfinalizedBlocks(block)) ?? null;

    // Only index block if we're not going to reindex
    if (!reindexBlockHeight) {
      await this.indexBlockData(block.block, filteredDataSources, async (ds: DS) => {
        // Injected runtimeVersion from fetch service might be outdated
        apiAt ??= await getApi();

        const vm = this.getDsProcessor(ds, apiAt);

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
      blockHash: block.getHeader().blockHash,
      reindexBlockHeight,
    };
  }

  protected async processUnfinalizedBlocks(block: IBlock<B>): Promise<number | undefined> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block);
    }
  }

  private filterDataSources(nextProcessingHeight: number, dataSources: DS[]): DS[] {
    let filteredDs: DS[];

    filteredDs = dataSources.filter(
      (ds) =>
        ds.startBlock !== undefined &&
        ds.startBlock <= nextProcessingHeight &&
        (ds.endBlock ?? Number.MAX_SAFE_INTEGER) >= nextProcessingHeight
    );

    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (this.isCustomDs(ds)) {
        return this.dsProcessorService.getDsProcessor(ds).dsFilterProcessor(ds, this.apiService.unsafeApi);
      } else {
        return true;
      }
    });

    return filteredDs;
  }

  private assertDataSources(ds: DS[], blockHeight: number) {
    if (!ds.length) {
      exitWithError(
        `Issue detected with data sources: \n
        Either all data sources have a 'startBlock' greater than the current indexed block height (${blockHeight}),
        or they have an 'endBlock' less than the current block. \n
        Solution options: \n
        1. Adjust 'startBlock' in project.yaml to be less than or equal to ${blockHeight},
           and 'endBlock' to be greater than or equal to ${blockHeight}. \n
        2. Delete your database and start again with the currently specified 'startBlock' and 'endBlock'.`,
        logger
      );
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        vm = vm! ?? (await getVM(ds));

        const parsedData = await this.prepareFilteredData(kind, data, ds);

        monitorWrite(`- Handler: ${handler.handler}, args:${handledStringify(data)}`);
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
        if (!baseFilter.length) return true;

        return baseFilter.find((filter) => this.filterMap[kind](data, filter, ds));
      });

      for (const handler of handlers) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        vm = vm! ?? (await getVM(ds));
        monitorWrite(`- Handler: ${handler.handler}, args:${handledStringify(data)}`);
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends keyof FilterMap>(
    ds: CDS, //SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    data: HandlerInputMap[K],
    baseHandlerCheck: ProcessorMap[K],
    baseFilter: (data: HandlerInputMap[K], baseFilter: any[]) => boolean
  ): CustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers
      .filter((handler) => {
        const processor = plugin.handlerProcessors[handler.kind];
        if (baseHandlerCheck(processor)) {
          return baseFilter(data, processor.baseFilter);
        }
        return false;
      })
      .filter((handler) => {
        const processor = asSecondLayerHandlerProcessor_1_0_0(plugin.handlerProcessors[handler.kind]);

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

    const processor = asSecondLayerHandlerProcessor_1_0_0(plugin.handlerProcessors[handler.kind]);

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
