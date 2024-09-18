// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  SubstrateCustomDataSource,
  SubstrateHandlerKind,
  SubstrateRuntimeHandlerInputMap,
} from '@subql/common-substrate';
import {
  NodeConfig,
  profiler,
  SandboxService,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
  DsProcessorService,
  IBlock,
  UnfinalizedBlocksService,
  IBlockchainService,
  DynamicDsService,
} from '@subql/node-core';
import {
  LightSubstrateEvent,
  SubstrateBlock,
  SubstrateBlockFilter,
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import {
  SubqueryProject,
  SubstrateProjectDs,
} from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService as SubstrateApiService } from './api.service';
import { ApiAt, BlockContent, isFullBlock, LightBlockContent } from './types';

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  ApiPromise,
  ApiAt,
  BlockContent | LightBlockContent,
  SubstrateApiService,
  SubstrateDatasource,
  SubstrateCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  SubstrateRuntimeHandlerInputMap
> {
  constructor(
    @Inject('APIService') apiService: SubstrateApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<ApiAt, ApiPromise>,
    dsProcessorService: DsProcessorService<
      SubstrateDatasource,
      SubstrateCustomDatasource
    >,
    dynamicDsService: DynamicDsService<SubstrateDatasource>,
    @Inject('IUnfinalizedBlocksService')
    unfinalizedBlocksService: UnfinalizedBlocksService<
      BlockContent | LightBlockContent
    >,
    @Inject('IBlockchainService')
    blockchainService: IBlockchainService<
      SubstrateDatasource,
      SubstrateCustomDatasource,
      SubqueryProject,
      ApiAt,
      LightBlockContent,
      BlockContent
    >,
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
      blockchainService,
    );
  }

  @profiler()
  async indexBlock(
    block: IBlock<BlockContent | LightBlockContent>,
    dataSources: SubstrateDatasource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.blockchainService.getSafeApi(block.block),
    );
  }

  protected async indexBlockData(
    blockContent: LightBlockContent | BlockContent,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    if (isFullBlock(blockContent)) {
      const { block, events, extrinsics } = blockContent;
      await this.indexContent(SubstrateHandlerKind.Block)(
        block,
        dataSources,
        getVM,
      );

      // Run initialization events
      const initEvents = events.filter((evt) => evt.phase.isInitialization);
      for (const event of initEvents) {
        await this.indexContent(SubstrateHandlerKind.Event)(
          event,
          dataSources,
          getVM,
        );
      }

      for (const extrinsic of extrinsics) {
        await this.indexContent(SubstrateHandlerKind.Call)(
          extrinsic,
          dataSources,
          getVM,
        );

        // Process extrinsic events
        const extrinsicEvents = events
          .filter((e) => e.extrinsic?.idx === extrinsic.idx)
          .sort((a, b) => a.idx - b.idx);

        for (const event of extrinsicEvents) {
          await this.indexContent(SubstrateHandlerKind.Event)(
            event,
            dataSources,
            getVM,
          );
        }
      }

      // Run finalization events
      const finalizeEvents = events.filter((evt) => evt.phase.isFinalization);
      for (const event of finalizeEvents) {
        await this.indexContent(SubstrateHandlerKind.Event)(
          event,
          dataSources,
          getVM,
        );
      }
    } else {
      for (const event of blockContent.events) {
        await this.indexContent(SubstrateHandlerKind.Event)(
          event,
          dataSources,
          getVM,
        );
      }
    }
  }

  private indexContent(
    kind: SubstrateHandlerKind,
  ): (
    content:
      | SubstrateBlock
      | SubstrateExtrinsic
      | SubstrateEvent
      | LightSubstrateEvent,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ) => Promise<void> {
    return async (content, dataSources, getVM) => {
      for (const ds of dataSources) {
        await this.indexData(kind, content, ds, getVM);
      }
    };
  }

  protected async prepareFilteredData<T = any>(
    kind: SubstrateHandlerKind,
    data: T,
  ): Promise<T> {
    // Substrate doesn't need to do anything here
    return Promise.resolve(data);
  }
}

const ProcessorTypeMap = {
  [SubstrateHandlerKind.Block]: isBlockHandlerProcessor,
  [SubstrateHandlerKind.Event]: isEventHandlerProcessor,
  [SubstrateHandlerKind.Call]: isCallHandlerProcessor,
};

const FilterTypeMap = {
  [SubstrateHandlerKind.Block]: (
    block: SubstrateBlock,
    filter?: SubstrateBlockFilter,
  ) => !!SubstrateUtil.filterBlock(block, filter),
  [SubstrateHandlerKind.Event]: SubstrateUtil.filterEvent,
  [SubstrateHandlerKind.Call]: SubstrateUtil.filterExtrinsic,
};
