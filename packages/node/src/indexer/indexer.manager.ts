// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
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
  getLogger,
  UnfinalizedBlocksService,
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
import { BlockchainService } from '../blockchain.service';
import { SubstrateProjectDs } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService as SubstrateApiService } from './api.service';
import { ApiAt, BlockContent, isFullBlock, LightBlockContent } from './types';

const logger = getLogger('indexer');

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
    blockchainService: BlockchainService,
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

      // Group the events so they only need to be iterated over a single time
      const groupedEvents = events.reduce(
        (acc, evt, idx) => {
          if (evt.phase.isInitialization) {
            acc.init.push(evt);
          } else if (evt.phase.isFinalization) {
            acc.finalize.push(evt);
          } else if (evt.extrinsic?.idx) {
            const idx = evt.extrinsic.idx;
            acc[idx] ??= [];
            acc[idx].push(evt);
          } else if (!evt.phase.isApplyExtrinsic) {
            logger.warn(
              `Unrecognized event type, skipping. block="${block.block.header.number.toNumber()}" eventIdx="${idx}"`,
            );
          }
          return acc;
        },
        { init: [], finalize: [] } as Record<
          number | 'init' | 'finalize',
          SubstrateEvent[]
        >,
      );

      // Run initialization events
      for (const event of groupedEvents.init) {
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
        const extrinsicEvents = (groupedEvents[extrinsic.idx] ?? []).sort(
          (a, b) => a.idx - b.idx,
        );

        for (const event of extrinsicEvents) {
          await this.indexContent(SubstrateHandlerKind.Event)(
            event,
            dataSources,
            getVM,
          );
        }
      }

      // Run finalization events
      for (const event of groupedEvents.finalize) {
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
