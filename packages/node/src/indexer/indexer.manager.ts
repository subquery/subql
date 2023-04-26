// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isTransactionHandlerProcessor,
  isMessageHandlerProcessor,
  isEventHandlerProcessor,
  isCustomCosmosDs,
  isRuntimeCosmosDs,
  SubqlCosmosCustomDataSource,
  SubqlCosmosCustomHandler,
  SubqlCosmosHandlerKind,
  CosmosRuntimeHandlerInputMap,
} from '@subql/common-cosmos';
import {
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
  IIndexerManager,
  ProcessBlockResponse,
} from '@subql/node-core';
import { CosmosEvent, CosmosMessage } from '@subql/types-cosmos';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import * as CosmosUtil from '../utils/cosmos';
import { yargsOptions } from '../yargs';
import { ApiService, CosmosClient, CosmosSafeClient } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { BlockContent } from './types';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager
  implements IIndexerManager<BlockContent, SubqlProjectDs>
{
  private api: CosmosClient;
  private filteredDataSources: SubqlProjectDs[];

  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    @Inject('IProjectService') private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(
    blockContent: BlockContent,
    dataSources: SubqlProjectDs[],
  ): Promise<ProcessBlockResponse> {
    const { block } = blockContent;
    const blockHeight = block.block.header.height;
    let dynamicDsCreated = false;
    const reindexBlockHeight: number | null = null;
    let safeApi: CosmosSafeClient;

    this.filteredDataSources = this.filterDataSources(
      block.block.header.height,
      dataSources,
    );

    this.assertDataSources(dataSources, blockHeight);

    await this.indexBlockData(
      blockContent,
      dataSources,
      async (ds: SubqlProjectDs) => {
        safeApi = safeApi ?? (await this.apiService.getSafeApi(blockHeight));

        const vm = this.sandboxService.getDsProcessor(ds, safeApi);

        // Inject function to create ds into vm
        vm.freeze(
          async (templateName: string, args?: Record<string, unknown>) => {
            const newDs = await this.dynamicDsService.createDynamicDatasource({
              templateName,
              args,
              startBlock: blockHeight,
            });
            // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
            dataSources.push(newDs);
            dynamicDsCreated = true;
          },
          'createDynamicDatasource',
        );

        return vm;
      },
    );

    return {
      dynamicDsCreated,
      blockHash: block.block.id,
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private filterDataSources(
    nextProcessingHeight: number,
    dataSources: SubqlProjectDs[],
  ): SubqlProjectDs[] {
    let filteredDs: SubqlProjectDs[];

    filteredDs = dataSources.filter(
      (ds) => ds.startBlock <= nextProcessingHeight,
    );

    if (filteredDs.length === 0) {
      logger.error(`Did not find any matching datasouces`);
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomCosmosDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.apiService.api);
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

  private assertDataSources(ds: SubqlProjectDs[], blockHeight: number) {
    if (!ds.length) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${blockHeight}
         or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
  }

  private async indexBlockData(
    blockContent: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(blockContent, dataSources, getVM);

    await this.indexTransaction(blockContent, dataSources, getVM);

    await this.indexMessage(blockContent, dataSources, getVM);

    await this.indexEvent(blockContent, dataSources, getVM);
  }

  private async indexBlockContent(
    block: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    block: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Transaction,
        block,
        ds,
        getVM,
      );
    }
  }

  private async indexMessage(
    block: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Message, block, ds, getVM);
    }
  }

  private async indexEvent(
    block: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Event, block, ds, getVM);
    }
  }

  private async indexData<K extends SubqlCosmosHandlerKind>(
    kind: K,
    //data: CosmosRuntimeHandlerInputMap[K],
    block: BlockContent,
    ds: SubqlProjectDs,
    getVM: (ds: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    let vm: IndexerSandbox;
    if (isRuntimeCosmosDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind, //&& FilterTypeMap[kind](data as any, h.filter),
      );

      const blockData = BlockContentTypeMap[kind](block);

      for (const data of blockData) {
        const filteredHandlers = handlers.filter((h) =>
          FilterTypeMap[kind](data as any, h.filter as any),
        );
        for (const handler of filteredHandlers) {
          vm = vm ?? (await getVM(ds));
          this.nodeConfig.profiler
            ? await profilerWrap(
                vm.securedExec.bind(vm),
                'handlerPerformance',
                handler.handler,
              )(handler.handler, [data])
            : await vm.securedExec(handler.handler, [data]);
        }
      }
    } else if (isCustomCosmosDs(ds)) {
      const blockData = BlockContentTypeMap[kind](block);

      for (const data of blockData) {
        const handlers = this.filterCustomDsHandlers<K>(
          ds,
          data as CosmosRuntimeHandlerInputMap[K],
          ProcessorTypeMap[kind],
          (data, baseFilter) => {
            switch (kind) {
              case SubqlCosmosHandlerKind.Message:
                return !!CosmosUtil.filterMessages(
                  [data as CosmosMessage],
                  baseFilter,
                ).length;
              case SubqlCosmosHandlerKind.Event:
                return !!CosmosUtil.filterEvents(
                  [data as CosmosEvent],
                  baseFilter,
                ).length;
              default:
                throw new Error('Unsuported handler kind');
            }
          },
        );
        for (const handler of handlers) {
          vm = vm ?? (await getVM(ds));
          await this.transformAndExecuteCustomDs(ds, vm, handler, data);
        }
      }
    }
  }

  private filterCustomDsHandlers<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string, any>,
    data: CosmosRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: CosmosRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubqlCosmosCustomHandler[] {
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
        const processor = asSecondLayerHandlerProcessor_1_0_0(
          plugin.handlerProcessors[handler.kind],
        );

        try {
          return processor.filterProcessor({
            filter: handler.filter,
            input: data,
            registry: this.apiService.api.registry,
            ds,
          });
        } catch (e) {
          logger.error(e, 'Failed to run ds processer filter.');
          throw e;
        }
      });
  }

  private async transformAndExecuteCustomDs<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string, any>,
    vm: IndexerSandbox,
    handler: SubqlCosmosCustomHandler,
    data: CosmosRuntimeHandlerInputMap[K],
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processor = asSecondLayerHandlerProcessor_1_0_0(
      plugin.handlerProcessors[handler.kind],
    );

    const transformedData = await processor
      .transformer({
        input: data,
        ds,
        api: this.apiService.api,
        filter: handler.filter,
        assets,
      })
      .catch((e) => {
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

type ProcessorTypeMap = {
  [SubqlCosmosHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [SubqlCosmosHandlerKind.Event]: typeof isEventHandlerProcessor;
  [SubqlCosmosHandlerKind.Transaction]: typeof isTransactionHandlerProcessor;
  [SubqlCosmosHandlerKind.Message]: typeof isMessageHandlerProcessor;
};

const ProcessorTypeMap = {
  [SubqlCosmosHandlerKind.Block]: isBlockHandlerProcessor,
  [SubqlCosmosHandlerKind.Event]: isEventHandlerProcessor,
  [SubqlCosmosHandlerKind.Transaction]: isTransactionHandlerProcessor,
  [SubqlCosmosHandlerKind.Message]: isMessageHandlerProcessor,
};

const FilterTypeMap = {
  [SubqlCosmosHandlerKind.Block]: CosmosUtil.filterBlock,
  [SubqlCosmosHandlerKind.Transaction]: CosmosUtil.filterTx,
  [SubqlCosmosHandlerKind.Event]: CosmosUtil.filterEvent,
  [SubqlCosmosHandlerKind.Message]: CosmosUtil.filterMessageData,
};

const BlockContentTypeMap = {
  [SubqlCosmosHandlerKind.Block]: (block: BlockContent) => [block.block],
  [SubqlCosmosHandlerKind.Transaction]: (block: BlockContent) =>
    block.transactions,
  [SubqlCosmosHandlerKind.Message]: (block: BlockContent) => block.messages,
  [SubqlCosmosHandlerKind.Event]: (block: BlockContent) => block.events,
};
