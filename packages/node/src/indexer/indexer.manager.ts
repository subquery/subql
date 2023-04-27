// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  SubstrateCustomDataSource,
  SubstrateCustomHandler,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateRuntimeHandlerInputMap,
} from '@subql/common-substrate';
import {
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
  IIndexerManager,
  ProcessBlockResponse,
} from '@subql/node-core';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { yargsOptions } from '../yargs';
import { ApiService } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { ApiAt, BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager
  implements IIndexerManager<BlockContent, SubqlProjectDs>
{
  constructor(
    private apiService: ApiService,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    @Inject('IProjectService') private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(
    blockContent: BlockContent,
    dataSources: SubqlProjectDs[],
    runtimeVersion: RuntimeVersion,
  ): Promise<ProcessBlockResponse> {
    const { block } = blockContent;
    let dynamicDsCreated = false;
    let reindexBlockHeight: number | null = null;
    const blockHeight = block.block.header.number.toNumber();

    const filteredDataSources = this.filterDataSources(
      block.block.header.number.toNumber(),
      dataSources,
    );

    this.assertDataSources(filteredDataSources, blockHeight);

    let apiAt: ApiAt;
    reindexBlockHeight = await this.processUnfinalizedBlocks(block);

    // Only index block if we're not going to reindex
    if (!reindexBlockHeight) {
      await this.indexBlockData(
        blockContent,
        filteredDataSources,
        async (ds: SubqlProjectDs) => {
          // Injected runtimeVersion from fetch service might be outdated
          apiAt =
            apiAt ??
            (await this.apiService.getPatchedApi(block, runtimeVersion));

          const vm = this.sandboxService.getDsProcessor(ds, apiAt);

          // Inject function to create ds into vm
          vm.freeze(
            async (templateName: string, args?: Record<string, unknown>) => {
              const newDs = await this.dynamicDsService.createDynamicDatasource(
                {
                  templateName,
                  args,
                  startBlock: blockHeight,
                },
              );
              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              filteredDataSources.push(newDs);
              dynamicDsCreated = true;
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );
    }

    return {
      dynamicDsCreated,
      blockHash: block.block.header.hash.toHex(),
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private async processUnfinalizedBlocks(
    block: SubstrateBlock,
  ): Promise<number | null> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block);
    }
    return null;
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
      if (isCustomDs(ds)) {
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
    { block, events, extrinsics }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    // Run initialization events
    const initEvents = events.filter((evt) => evt.phase.isInitialization);
    for (const event of initEvents) {
      await this.indexEvent(event, dataSources, getVM);
    }

    for (const extrinsic of extrinsics) {
      await this.indexExtrinsic(extrinsic, dataSources, getVM);

      // Process extrinsic events
      const extrinsicEvents = events
        .filter((e) => e.extrinsic?.idx === extrinsic.idx)
        .sort((a, b) => a.idx - b.idx);

      for (const event of extrinsicEvents) {
        await this.indexEvent(event, dataSources, getVM);
      }
    }

    // Run finalization events
    const finalizeEvents = events.filter((evt) => evt.phase.isFinalization);
    for (const event of finalizeEvents) {
      await this.indexEvent(event, dataSources, getVM);
    }
  }

  private async indexBlockContent(
    block: SubstrateBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexExtrinsic(
    extrinsic: SubstrateExtrinsic,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Call, extrinsic, ds, getVM);
    }
  }

  private async indexEvent(
    event: SubstrateEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Event, event, ds, getVM);
    }
  }

  private async indexData<K extends SubstrateHandlerKind>(
    kind: K,
    data: SubstrateRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    getVM: (ds: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    let vm: IndexerSandbox;
    if (isRuntimeDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind && FilterTypeMap[kind](data as any, h.filter),
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        this.nodeConfig.profiler
          ? await profilerWrap(
              vm.securedExec.bind(vm),
              'handlerPerformance',
              handler.handler,
            )(handler.handler, [data])
          : await vm.securedExec(handler.handler, [data]);
      }
    } else if (isCustomDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
        ProcessorTypeMap[kind],
        (data, baseFilter) => {
          switch (kind) {
            case SubstrateHandlerKind.Block:
              return !!SubstrateUtil.filterBlock(
                data as SubstrateBlock,
                baseFilter,
              );
            case SubstrateHandlerKind.Call:
              return !!SubstrateUtil.filterExtrinsics(
                [data as SubstrateExtrinsic],
                baseFilter,
              ).length;
            case SubstrateHandlerKind.Event:
              return !!SubstrateUtil.filterEvents(
                [data as SubstrateEvent],
                baseFilter,
              ).length;
            default:
              throw new Error('Unsupported handler kind');
          }
        },
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends SubstrateHandlerKind>(
    ds: SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    data: SubstrateRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: SubstrateRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubstrateCustomHandler[] {
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
            ds,
          });
        } catch (e) {
          logger.error(e, 'Failed to run ds processer filter.');
          throw e;
        }
      });
  }

  private async transformAndExecuteCustomDs<K extends SubstrateHandlerKind>(
    ds: SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    vm: IndexerSandbox,
    handler: SubstrateCustomHandler,
    data: SubstrateRuntimeHandlerInputMap[K],
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
        filter: handler.filter,
        api: this.apiService.api,
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
  [SubstrateHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [SubstrateHandlerKind.Event]: typeof isEventHandlerProcessor;
  [SubstrateHandlerKind.Call]: typeof isCallHandlerProcessor;
};

const ProcessorTypeMap = {
  [SubstrateHandlerKind.Block]: isBlockHandlerProcessor,
  [SubstrateHandlerKind.Event]: isEventHandlerProcessor,
  [SubstrateHandlerKind.Call]: isCallHandlerProcessor,
};

const FilterTypeMap = {
  [SubstrateHandlerKind.Block]: SubstrateUtil.filterBlock,
  [SubstrateHandlerKind.Event]: SubstrateUtil.filterEvent,
  [SubstrateHandlerKind.Call]: SubstrateUtil.filterExtrinsic,
};
