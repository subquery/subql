// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  SubqlEthereumCustomDataSource,
  SubqlCustomHandler,
  EthereumHandlerKind,
  EthereumRuntimeHandlerInputMap,
} from '@subql/common-ethereum';
import {
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
  ProcessBlockResponse,
  ApiService,
  IIndexerManager,
} from '@subql/node-core';
import {
  EthereumTransaction,
  EthereumLog,
  SubqlRuntimeHandler,
  EthereumBlockWrapper,
  EthereumBlock,
} from '@subql/types-ethereum';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import { EthereumApi } from '../ethereum';
import { EthereumBlockWrapped } from '../ethereum/block.ethereum';
import { yargsOptions } from '../yargs';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager
  implements IIndexerManager<EthereumBlockWrapper, SubqlProjectDs>
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
    blockContent: EthereumBlockWrapper,
    dataSources: SubqlProjectDs[],
  ): Promise<ProcessBlockResponse> {
    const { block, blockHeight } = blockContent;
    let dynamicDsCreated = false;
    let reindexBlockHeight: number | null = null;

    const filteredDataSources = this.filterDataSources(
      blockHeight,
      dataSources,
    );

    this.assertDataSources(filteredDataSources, blockHeight);
    reindexBlockHeight = await this.processUnfinalizedBlocks(block);

    // Only index block if we're not going to reindex
    if (!reindexBlockHeight) {
      await this.indexBlockData(
        blockContent,
        filteredDataSources,
        // eslint-disable-next-line @typescript-eslint/require-await
        async (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessorWrapper(
            ds,
            this.apiService.api,
            blockContent,
          );

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
      blockHash: block.hash,
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private async processUnfinalizedBlocks(
    block: EthereumBlock,
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
    { block, transactions }: EthereumBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const tx of transactions) {
      await this.indexTransaction(tx, dataSources, getVM);

      for (const log of tx.logs ?? []) {
        await this.indexEvent(log, dataSources, getVM);
      }
    }
  }

  private async indexBlockContent(
    block: EthereumBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(EthereumHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    tx: EthereumTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(EthereumHandlerKind.Call, tx, ds, getVM);
    }
  }

  private async indexEvent(
    log: EthereumLog,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(EthereumHandlerKind.Event, log, ds, getVM);
    }
  }

  private async indexData<K extends EthereumHandlerKind>(
    kind: K,
    data: EthereumRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    getVM: (ds: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    let vm: IndexerSandbox;
    if (isRuntimeDs(ds)) {
      const handlers = (ds.mapping.handlers as SubqlRuntimeHandler[]).filter(
        (h) =>
          h.kind === kind &&
          FilterTypeMap[kind](
            data as any,
            h.filter as any,
            ds.options?.address,
          ),
      );

      if (!handlers.length) {
        return;
      }
      const parsedData = await DataAbiParser[kind](this.apiService.api)(
        data,
        ds,
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        this.nodeConfig.profiler
          ? await profilerWrap(
              vm.securedExec.bind(vm),
              'handlerPerformance',
              handler.handler,
            )(handler.handler, [parsedData])
          : await vm.securedExec(handler.handler, [parsedData]);
      }
    } else if (isCustomDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
        ProcessorTypeMap[kind],
        (data, baseFilter) => {
          switch (kind) {
            case EthereumHandlerKind.Block:
              return EthereumBlockWrapped.filterBlocksProcessor(
                data as EthereumBlock,
                baseFilter,
              );
            case EthereumHandlerKind.Call:
              return EthereumBlockWrapped.filterTransactionsProcessor(
                data as EthereumTransaction,
                baseFilter,
              );
            case EthereumHandlerKind.Event:
              return EthereumBlockWrapped.filterLogsProcessor(
                data as EthereumLog,
                baseFilter,
              );
            default:
              throw new Error('Unsupported handler kind');
          }
        },
      );

      if (!handlers.length) {
        return;
      }

      const parsedData = await DataAbiParser[kind](this.apiService.api)(
        data,
        ds,
      );

      for (const handler of handlers) {
        vm = vm ?? (await getVM(ds));
        await this.transformAndExecuteCustomDs(ds, vm, handler, parsedData);
      }
    }
  }

  private filterCustomDsHandlers<K extends EthereumHandlerKind>(
    ds: SubqlEthereumCustomDataSource<string, any>,
    data: EthereumRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: EthereumRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubqlCustomHandler[] {
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

  private async transformAndExecuteCustomDs<K extends EthereumHandlerKind>(
    ds: SubqlEthereumCustomDataSource<string, any>,
    vm: IndexerSandbox,
    handler: SubqlCustomHandler,
    data: EthereumRuntimeHandlerInputMap[K],
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
  [EthereumHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [EthereumHandlerKind.Event]: typeof isEventHandlerProcessor;
  [EthereumHandlerKind.Call]: typeof isCallHandlerProcessor;
};

const ProcessorTypeMap = {
  [EthereumHandlerKind.Block]: isBlockHandlerProcessor,
  [EthereumHandlerKind.Event]: isEventHandlerProcessor,
  [EthereumHandlerKind.Call]: isCallHandlerProcessor,
};

const FilterTypeMap = {
  [EthereumHandlerKind.Block]: EthereumBlockWrapped.filterBlocksProcessor,
  [EthereumHandlerKind.Event]: EthereumBlockWrapped.filterLogsProcessor,
  [EthereumHandlerKind.Call]: EthereumBlockWrapped.filterTransactionsProcessor,
};

const DataAbiParser = {
  [EthereumHandlerKind.Block]: () => (data: EthereumBlock) => data,
  [EthereumHandlerKind.Event]: (api: EthereumApi) => api.parseLog.bind(api),
  [EthereumHandlerKind.Call]: (api: EthereumApi) =>
    api.parseTransaction.bind(api),
};
