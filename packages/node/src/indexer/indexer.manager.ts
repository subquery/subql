// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Block } from '@ethersproject/abstract-provider';
import { Injectable } from '@nestjs/common';
import { hexToU8a, u8aEq } from '@polkadot/util';
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
  ApiService,
  PoiBlock,
  StoreService,
  PoiService,
  NodeConfig,
  getLogger,
  profiler,
  profilerWrap,
  IndexerSandbox,
} from '@subql/node-core';
import {
  EthereumTransaction,
  EthereumLog,
  SubqlRuntimeHandler,
  EthereumBlockWrapper,
  EthereumBlock,
} from '@subql/types-ethereum';
import { Sequelize, Transaction } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
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

const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager {
  private api: EthereumApi;
  private filteredDataSources: SubqlProjectDs[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private poiService: PoiService,
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    private dsProcessorService: DsProcessorService,
    private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');

    this.api = this.apiService.api;
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(blockContent: EthereumBlockWrapper): Promise<{
    dynamicDsCreated: boolean;
    operationHash: Uint8Array;
    reindexBlockHeight: null;
  }> {
    const { block, blockHeight } = blockContent;
    let dynamicDsCreated = false;
    let reindexBlockHeight = null;
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let operationHash = NULL_MERKEL_ROOT;
    let poiBlockHash: Uint8Array;

    try {
      this.filteredDataSources = this.filterDataSources(blockHeight);

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      reindexBlockHeight = await this.processUnfinalizedBlocks(block, tx);

      await this.indexBlockData(
        blockContent,
        datasources,
        // eslint-disable-next-line @typescript-eslint/require-await
        async (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessorWrapper(
            ds,
            this.api,
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
                tx,
              );
              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              datasources.push(newDs);
              dynamicDsCreated = true;
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );

      await this.storeService.setMetadataBatch(
        [
          { key: 'lastProcessedHeight', value: blockHeight },
          { key: 'lastProcessedTimestamp', value: Date.now() },
        ],
        { transaction: tx },
      );
      // Db Metadata increase BlockCount, in memory ref to block-dispatcher _processedBlockCount
      await this.storeService.incrementJsonbCount('processedBlockCount', tx);

      // Need calculate operationHash to ensure correct offset insert all time
      operationHash = this.storeService.getOperationMerkleRoot();
      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            blockContent.block.hash,
            operationHash,
            await this.poiService.getLatestPoiBlockHash(),
            this.project.id,
          );
          poiBlockHash = poiBlock.hash;
          await this.storeService.setPoi(poiBlock, { transaction: tx });
          this.poiService.setLatestPoiBlockHash(poiBlockHash);
          await this.storeService.setMetadataBatch(
            [{ key: 'lastPoiHeight', value: blockHeight }],
            { transaction: tx },
          );
        }
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    await tx.commit();

    return {
      dynamicDsCreated,
      operationHash,
      reindexBlockHeight,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  private async processUnfinalizedBlocks(
    block: EthereumBlock,
    tx: Transaction,
  ): Promise<number | null> {
    if (this.nodeConfig.unfinalizedBlocks) {
      return this.unfinalizedBlocksService.processUnfinalizedBlocks(block, tx);
    }
    return null;
  }

  private filterDataSources(nextProcessingHeight: number): SubqlProjectDs[] {
    const filteredDs = this.projectService.dataSources.filter(
      (ds) => ds.startBlock <= nextProcessingHeight,
    );

    if (filteredDs.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${nextProcessingHeight}
         or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    // perform filter for custom ds
    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private async indexBlockData(
    { block, logs, transactions }: EthereumBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const log of logs) {
      await this.indexEvent(log, dataSources, getVM);
    }

    for (const tx of transactions) {
      await this.indexExtrinsic(tx, dataSources, getVM);
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

  private async indexExtrinsic(
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
      const parsedData = await DataAbiParser[kind](this.api)(data, ds);

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

      const parsedData = await DataAbiParser[kind](this.api)(data, ds);

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
        api: this.api,
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
