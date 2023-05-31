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
  EthereumHandlerKind,
  EthereumRuntimeHandlerInputMap,
  SubqlEthereumDataSource,
} from '@subql/common-ethereum';
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
  EthereumTransaction,
  EthereumLog,
  EthereumBlockWrapper,
  EthereumBlock,
  SubqlRuntimeDatasource,
  EthereumBlockFilter,
  EthereumLogFilter,
  EthereumTransactionFilter,
} from '@subql/types-ethereum';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import { EthereumApi } from '../ethereum';
import { EthereumBlockWrapped } from '../ethereum/block.ethereum';
import SafeEthProvider from '../ethereum/safe-api';
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
  ApiService,
  SafeEthProvider,
  EthereumBlockWrapper,
  SubqlEthereumDataSource,
  SubqlEthereumCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  EthereumRuntimeHandlerInputMap
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
    block: EthereumBlockWrapper,
    dataSources: SubqlEthereumDataSource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block),
    );
  }

  getBlockHeight(block: EthereumBlockWrapper): number {
    return block.blockHeight;
  }

  getBlockHash(block: EthereumBlockWrapper): string {
    return block.block.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(block: EthereumBlockWrapper): Promise<SafeEthProvider> {
    return this.apiService.api.getSafeApi(this.getBlockHeight(block));
  }

  protected async indexBlockData(
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

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async prepareFilteredData(
    kind: EthereumHandlerKind,
    data: any,
    ds: SubqlRuntimeDatasource,
  ): Promise<any> {
    return DataAbiParser[kind](this.apiService.api)(data, ds);
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
  [EthereumHandlerKind.Block]: (
    data: EthereumBlock,
    filter: EthereumBlockFilter,
    ds: SubqlEthereumDataSource,
  ) =>
    EthereumBlockWrapped.filterBlocksProcessor(
      data,
      filter,
      ds.options?.address,
    ),
  [EthereumHandlerKind.Event]: (
    data: EthereumLog,
    filter: EthereumLogFilter,
    ds: SubqlEthereumDataSource,
  ) =>
    EthereumBlockWrapped.filterLogsProcessor(data, filter, ds.options?.address),
  [EthereumHandlerKind.Call]: (
    data: EthereumTransaction,
    filter: EthereumTransactionFilter,
    ds: SubqlEthereumDataSource,
  ) =>
    EthereumBlockWrapped.filterTransactionsProcessor(
      data,
      filter,
      ds.options?.address,
    ),
};

const DataAbiParser = {
  [EthereumHandlerKind.Block]: () => (data: EthereumBlock) => data,
  [EthereumHandlerKind.Event]:
    (api: EthereumApi) => (data: EthereumLog, ds: SubqlRuntimeDatasource) =>
      api.parseLog(data, ds),
  [EthereumHandlerKind.Call]:
    (api: EthereumApi) =>
    (data: EthereumTransaction, ds: SubqlRuntimeDatasource) =>
      api.parseTransaction(data, ds),
};
