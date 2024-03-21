// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
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
  IBlock,
} from '@subql/node-core';
import {
  EthereumTransaction,
  EthereumLog,
  EthereumBlock,
  SubqlRuntimeDatasource,
  EthereumBlockFilter,
  EthereumLogFilter,
  EthereumTransactionFilter,
  LightEthereumLog,
} from '@subql/types-ethereum';
import { EthereumProjectDs } from '../configure/SubqueryProject';
import { EthereumApi, EthereumApiService } from '../ethereum';
import {
  filterBlocksProcessor,
  filterLogsProcessor,
  filterTransactionsProcessor,
  isFullBlock,
} from '../ethereum/block.ethereum';
import SafeEthProvider from '../ethereum/safe-api';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { SandboxService } from './sandbox.service';
import { BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  SafeEthProvider,
  EthereumApi,
  BlockContent,
  EthereumApiService,
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
    apiService: EthereumApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService,
    dsProcessorService: DsProcessorService,
    dynamicDsService: DynamicDsService,
    unfinalizedBlocksService: UnfinalizedBlocksService,
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

  @profiler()
  async indexBlock(
    block: IBlock<BlockContent>,
    dataSources: SubqlEthereumDataSource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block.block),
    );
  }

  getBlockHeight(block: BlockContent): number {
    return block.number;
  }

  getBlockHash(block: BlockContent): string {
    return block.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(block: BlockContent): Promise<SafeEthProvider> {
    return this.apiService.safeApi(this.getBlockHeight(block));
  }

  protected async indexBlockData(
    block: BlockContent,
    dataSources: EthereumProjectDs[],
    getVM: (d: EthereumProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    if (isFullBlock(block)) {
      await this.indexBlockContent(block, dataSources, getVM);

      for (const tx of block.transactions) {
        await this.indexTransaction(tx, dataSources, getVM);

        for (const log of tx.logs ?? []) {
          await this.indexEvent(log, dataSources, getVM);
        }
      }
    } else {
      for (const log of block.logs ?? []) {
        await this.indexEvent(log, dataSources, getVM);
      }
    }
  }

  private async indexBlockContent(
    block: EthereumBlock,
    dataSources: EthereumProjectDs[],
    getVM: (d: EthereumProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(EthereumHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexTransaction(
    tx: EthereumTransaction,
    dataSources: EthereumProjectDs[],
    getVM: (d: EthereumProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(EthereumHandlerKind.Call, tx, ds, getVM);
    }
  }

  private async indexEvent(
    log: EthereumLog | LightEthereumLog,
    dataSources: EthereumProjectDs[],
    getVM: (d: EthereumProjectDs) => Promise<IndexerSandbox>,
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
  ) => filterBlocksProcessor(data, filter, ds.options?.address),
  [EthereumHandlerKind.Event]: (
    data: EthereumLog | LightEthereumLog,
    filter: EthereumLogFilter,
    ds: SubqlEthereumDataSource,
  ) => filterLogsProcessor(data, filter, ds.options?.address),
  [EthereumHandlerKind.Call]: (
    data: EthereumTransaction,
    filter: EthereumTransactionFilter,
    ds: SubqlEthereumDataSource,
  ) => filterTransactionsProcessor(data, filter, ds.options?.address),
};

const DataAbiParser = {
  [EthereumHandlerKind.Block]: () => (data: EthereumBlock) => data,
  [EthereumHandlerKind.Event]:
    (api: EthereumApi) =>
    (data: EthereumLog | LightEthereumLog, ds: SubqlRuntimeDatasource) =>
      api.parseLog(data, ds),
  [EthereumHandlerKind.Call]:
    (api: EthereumApi) =>
    (data: EthereumTransaction, ds: SubqlRuntimeDatasource) =>
      api.parseTransaction(data, ds),
};
