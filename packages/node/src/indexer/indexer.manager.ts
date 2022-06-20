// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { hexToU8a, u8aEq } from '@polkadot/util';
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
  CosmosBlock,
  CosmosEvent,
  CosmosMessage,
  CosmosTransaction,
} from '@subql/types-cosmos';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryRepo } from '../entities';
import * as CosmosUtil from '../utils/cosmos';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { ApiService, CosmosClient } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { IndexerEvent } from './events';
import { FetchService } from './fetch.service';
import { MmrService } from './mmr.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { ProjectService } from './project.service';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { BlockContent } from './types';

const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: CosmosClient;
  private filteredDataSources: SubqlProjectDs[];
  private blockOffset: number;

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private fetchService: FetchService,
    private poiService: PoiService,
    protected mmrService: MmrService,
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
    private projectService: ProjectService,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: BlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = block.block.header.height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let poiBlockHash: Uint8Array;
    try {
      const safeApi = await this.apiService.getSafeApi(blockHeight);

      this.filteredDataSources = this.filterDataSources(blockHeight);

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      await this.indexBlockData(
        blockContent,
        datasources,
        (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessor(ds, safeApi);

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
              await this.fetchService.resetForNewDs(blockHeight);
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
      // Need calculate operationHash to ensure correct offset insert all time
      const operationHash = this.storeService.getOperationMerkleRoot();
      if (
        !u8aEq(operationHash, NULL_MERKEL_ROOT) &&
        this.blockOffset === undefined
      ) {
        await this.projectService.upsertMetadataBlockOffset(
          blockHeight - 1,
          tx,
        );
        this.projectService.setBlockOffset(blockHeight - 1);
      }

      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            block.block.id,
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
    this.fetchService.latestProcessed(block.block.header.height);
  }

  async start(): Promise<void> {
    await this.projectService.init();
    await this.fetchService.init();

    this.api = this.apiService.getApi();
    const startHeight = this.projectService.startHeight;

    void this.fetchService.startLoop(startHeight).catch((err) => {
      logger.error(err, 'failed to fetch block');
      // FIXME: retry before exit
      process.exit(1);
    });
    this.fetchService.register((block) => this.indexBlock(block));
  }

  private filterDataSources(nextProcessingHeight: number): SubqlProjectDs[] {
    let filteredDs: SubqlProjectDs[];
    filteredDs = this.project.dataSources.filter(
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
          .dsFilterProcessor(ds, this.api.StargateClient);
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

  private async indexBlockData(
    { block, events, messages, transactions }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const tx of transactions) {
      await this.indexTransaction(tx, dataSources, getVM);
    }

    for (const msg of messages) {
      await this.indexMessage(msg, dataSources, getVM);
    }

    for (const evt of events) {
      await this.indexEvent(evt, dataSources, getVM);
    }
  }

  private async indexBlockContent(
    block: CosmosBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Block, block, ds, getVM(ds));
    }
  }

  private async indexTransaction(
    transaction: CosmosTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Transaction,
        transaction,
        ds,
        getVM(ds),
      );
    }
  }

  private async indexMessage(
    message: CosmosMessage,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Message,
        message,
        ds,
        getVM(ds),
      );
    }
  }

  private async indexEvent(
    event: CosmosEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Event, event, ds, getVM(ds));
    }
  }

  private async indexData<K extends SubqlCosmosHandlerKind>(
    kind: K,
    data: CosmosRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    vm: IndexerSandbox,
  ): Promise<void> {
    if (isRuntimeCosmosDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind && FilterTypeMap[kind](data as any, h.filter),
      );

      //check for CosmosEvent
      if ('msg' in data && 'event' in data) {
        data.msg.msg = {
          typeUrl: data.msg.msg.typeUrl,
          ...data.msg.msg.decodedMsg,
        };
      } else if ('msg' in data) {
        //check for CosmosMessage
        data.msg = {
          typeUrl: data.msg.typeUrl,
          ...data.msg.decodedMsg,
        };
      }

      for (const handler of handlers) {
        await vm.securedExec(handler.handler, [data]);
      }
    } else if (isCustomCosmosDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
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
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string>,
    data: CosmosRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: CosmosRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubqlCosmosCustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers.filter((handler) => {
      const processor = plugin.handlerProcessors[handler.kind];
      if (baseHandlerCheck(processor)) {
        processor.baseFilter;
        return baseFilter(data, processor.baseFilter);
      }
      return false;
    });
  }

  private async transformAndExecuteCustomDs<K extends SubqlCosmosHandlerKind>(
    ds: SubqlCosmosCustomDataSource<string>,
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
        api: this.api.StargateClient,
        assets,
      })
      .catch((e) => {
        logger.error(e, 'Failed to transform data with ds processor.');
        throw e;
      });

    await Promise.all(
      transformedData.map((data) => vm.securedExec(handler.handler, [data])),
    );
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
  [SubqlCosmosHandlerKind.Block]: () => true,
  [SubqlCosmosHandlerKind.Transaction]: () => true,
  [SubqlCosmosHandlerKind.Event]: CosmosUtil.filterEvent,
  [SubqlCosmosHandlerKind.Message]: CosmosUtil.filterMessageData,
};
