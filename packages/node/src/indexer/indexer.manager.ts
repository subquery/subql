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
  SubqlCosmosHandlerKind,
  CosmosRuntimeHandlerInputMap,
} from '@subql/common-cosmos';
import {
  NodeConfig,
  getLogger,
  profiler,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
} from '@subql/node-core';
import {
  CosmosBlock,
  CosmosEvent,
  CosmosMessage,
  CosmosTransaction,
  SubqlCosmosCustomDatasource,
  SubqlCosmosDatasource,
} from '@subql/types-cosmos';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import * as CosmosUtil from '../utils/cosmos';
import { yargsOptions } from '../yargs';
import { ApiService, CosmosSafeClient } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  ApiService,
  CosmosSafeClient,
  BlockContent,
  SubqlCosmosDatasource,
  SubqlCosmosCustomDatasource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  CosmosRuntimeHandlerInputMap
> {
  protected isRuntimeDs = isRuntimeCosmosDs;
  protected isCustomDs = isCustomCosmosDs;
  protected updateCustomProcessor = asSecondLayerHandlerProcessor_1_0_0;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<CosmosSafeClient>,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
    @Inject('IProjectService') private projectService: ProjectService,
  ) {
    super(
      apiService,
      nodeConfig,
      sandboxService,
      dsProcessorService,
      dynamicDsService,
      unfinalizedBlocksService,
      FilterTypeMap,
      ProcessorTypeMap,
    );
  }

  async start(): Promise<void> {
    await this.projectService.init();
    logger.info('indexer manager started');
  }

  @profiler(yargsOptions.argv.profiler)
  async indexBlock(
    block: BlockContent,
    dataSources: SubqlCosmosDatasource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block),
    );
  }

  getBlockHeight(block: BlockContent): number {
    return block.block.block.header.height;
  }

  getBlockHash(block: BlockContent): string {
    return block.block.block.id;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(block: BlockContent): Promise<CosmosSafeClient> {
    return this.apiService.getSafeApi(this.getBlockHeight(block));
  }

  protected async indexBlockData(
    blockContent: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(blockContent, dataSources, getVM);

    for (const tx of blockContent.transactions) {
      await this.indexTransaction(tx, dataSources, getVM);
      const msgs = blockContent.messages.filter(
        (msg) => msg.tx.hash === tx.hash,
      );
      for (const msg of msgs) {
        await this.indexMessage(msg, dataSources, getVM);
        const events = blockContent.events.filter(
          (event) => event.msg?.idx === msg.idx,
        );
        for (const evt of events) {
          await this.indexEvent(evt, dataSources, getVM);
        }
      }
    }
  }

  private async indexBlockContent(
    block: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SubqlCosmosHandlerKind.Block,
        block.block,
        ds,
        getVM,
      );
    }
  }

  private async indexTransaction(
    tx: CosmosTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Transaction, tx, ds, getVM);
    }
  }

  private async indexMessage(
    message: CosmosMessage,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Message, message, ds, getVM);
    }
  }

  private async indexEvent(
    event: CosmosEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubqlCosmosHandlerKind.Event, event, ds, getVM);
    }
  }

  protected async prepareFilteredData<T = any>(
    kind: SubqlCosmosHandlerKind,
    data: T,
  ): Promise<T> {
    // Substrate doesn't need to do anything here
    return Promise.resolve(data);
  }

  protected baseCustomHandlerFilter(
    kind: SubqlCosmosHandlerKind,
    data: any,
    baseFilter: any,
  ): boolean {
    switch (kind) {
      case SubqlCosmosHandlerKind.Block:
        return !!CosmosUtil.filterBlock(data as CosmosBlock, baseFilter);
      case SubqlCosmosHandlerKind.Transaction:
        return !!CosmosUtil.filterTx(data as CosmosTransaction, baseFilter);
      case SubqlCosmosHandlerKind.Message:
        return !!CosmosUtil.filterMessages([data as CosmosMessage], baseFilter)
          .length;
      case SubqlCosmosHandlerKind.Event:
        return !!CosmosUtil.filterEvents([data as CosmosEvent], baseFilter)
          .length;
      default:
        throw new Error('Unsuported handler kind');
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
