// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isCustomDs,
  isRuntimeDs,
  SubqlSorobanCustomDataSource,
  SorobanHandlerKind,
  SorobanRuntimeHandlerInputMap,
  SubqlSorobanDataSource,
  isBlockHandlerProcessor,
  isTransactionHandlerProcessor,
  isOperationHandlerProcessor,
  isEffectHandlerProcessor,
} from '@subql/common-soroban';
import {
  NodeConfig,
  getLogger,
  profiler,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
  ApiService,
} from '@subql/node-core';
import {
  SorobanBlockWrapper,
  SubqlDatasource,
  SorobanTransaction,
  SorobanOperation,
  SorobanEffect,
  SorobanBlock,
  SorobanBlockFilter,
  SorobanTransactionFilter,
  SorobanOperationFilter,
  SorobanEffectFilter,
} from '@subql/types-soroban';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import { SorobanApi } from '../soroban';
import { SorobanBlockWrapped } from '../soroban/block.soroban';
import SafeSorobanProvider from '../soroban/safe-api';
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
export class IndexerManager extends BaseIndexerManager<
  SafeSorobanProvider,
  SorobanApi,
  SorobanBlockWrapper,
  ApiService,
  SubqlSorobanDataSource,
  SubqlSorobanCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  SorobanRuntimeHandlerInputMap
> {
  protected isRuntimeDs = isRuntimeDs;
  protected isCustomDs = isCustomDs;
  protected updateCustomProcessor = asSecondLayerHandlerProcessor_1_0_0;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService,
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

  @profiler()
  async indexBlock(
    block: SorobanBlockWrapper,
    dataSources: SubqlSorobanDataSource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block),
    );
  }

  getBlockHeight(block: SorobanBlockWrapper): number {
    return block.block.sequence;
  }

  getBlockHash(block: SorobanBlockWrapper): string {
    return block.block.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(
    block: SorobanBlockWrapper,
  ): Promise<SafeSorobanProvider> {
    // return this.apiService.safeApi(this.getBlockHeight(block));
    return null;
  }

  protected async indexBlockData(
    { block, effects, operations, transactions }: SorobanBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const tx of transactions) {
      await this.indexTransaction(tx, dataSources, getVM);

      for (const operation of tx.operations) {
        await this.indexOperation(operation, dataSources, getVM);

        for (const effect of operation.effects) {
          await this.indexEffect(effect, dataSources, getVM);
        }
      }
    }
  }

  private async indexBlockContent(
    block: SorobanBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SorobanHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    transaction: SorobanTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(
        SorobanHandlerKind.Transaction,
        transaction,
        ds,
        getVM,
      );
    }
  }

  private async indexOperation(
    operation: SorobanOperation,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SorobanHandlerKind.Operation, operation, ds, getVM);
    }
  }

  private async indexEffect(
    effect: SorobanEffect,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SorobanHandlerKind.Effects, effect, ds, getVM);
    }
  }

  /*
  private async indexEvent(
    event: SorobanEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SorobanHandlerKind.Event, event, ds, getVM);
    }
  }
  */

  protected async prepareFilteredData<T = any>(
    kind: SorobanHandlerKind,
    data: T,
    ds: SubqlDatasource,
  ): Promise<T> {
    return Promise.resolve(data);
  }
}

type ProcessorTypeMap = {
  [SorobanHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [SorobanHandlerKind.Transaction]: typeof isTransactionHandlerProcessor;
  [SorobanHandlerKind.Operation]: typeof isOperationHandlerProcessor;
  [SorobanHandlerKind.Effects]: typeof isEffectHandlerProcessor;
  //[SorobanHandlerKind.Event]: typeof isEventHandlerProcessor;
};

const ProcessorTypeMap = {
  [SorobanHandlerKind.Block]: isBlockHandlerProcessor,
  [SorobanHandlerKind.Transaction]: isTransactionHandlerProcessor,
  [SorobanHandlerKind.Operation]: isOperationHandlerProcessor,
  [SorobanHandlerKind.Effects]: isEffectHandlerProcessor,
  //[SorobanHandlerKind.Event]: isEventHandlerProcessor,
};

const FilterTypeMap = {
  [SorobanHandlerKind.Block]: (
    data: SorobanBlock,
    filter: SorobanBlockFilter,
    ds: SubqlSorobanDataSource,
  ) =>
    SorobanBlockWrapped.filterBlocksProcessor(
      data,
      filter,
      ds.options?.address,
    ),

  [SorobanHandlerKind.Transaction]: (
    data: SorobanTransaction,
    filter: SorobanTransactionFilter,
    ds: SubqlSorobanDataSource,
  ) =>
    SorobanBlockWrapped.filterTransactionProcessor(
      data,
      filter,
      ds.options?.address,
    ),

  [SorobanHandlerKind.Operation]: (
    data: SorobanOperation,
    filter: SorobanOperationFilter,
    ds: SubqlSorobanDataSource,
  ) =>
    SorobanBlockWrapped.filterOperationProcessor(
      data,
      filter,
      ds.options?.address,
    ),

  [SorobanHandlerKind.Effects]: (
    data: SorobanEffect,
    filter: SorobanEffectFilter,
    ds: SubqlSorobanDataSource,
  ) =>
    SorobanBlockWrapped.filterEffectProcessor(
      data,
      filter,
      ds.options?.address,
    ),
};
