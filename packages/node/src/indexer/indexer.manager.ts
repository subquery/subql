// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  SubstrateHandlerKind,
  SubstrateRuntimeHandlerInputMap,
} from '@subql/common-substrate';
import {
  NodeConfig,
  getLogger,
  profiler,
  IndexerSandbox,
  ProcessBlockResponse,
  BaseIndexerManager,
} from '@subql/node-core';
import {
  LightSubstrateEvent,
  SubstrateBlock,
  SubstrateBlockFilter,
  SubstrateDatasource,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { SubstrateProjectDs } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { SandboxService } from './sandbox.service';
import { ApiAt, BlockContent, isFullBlock, LightBlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  ApiAt,
  ApiPromise,
  BlockContent | LightBlockContent,
  ApiService,
  SubstrateDatasource,
  SubstrateCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  SubstrateRuntimeHandlerInputMap
> {
  protected isRuntimeDs = isRuntimeDs;
  protected isCustomDs = isCustomDs;
  protected updateCustomProcessor = asSecondLayerHandlerProcessor_1_0_0;

  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    sandboxService: SandboxService<ApiAt>,
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
    block: BlockContent | LightBlockContent,
    dataSources: SubstrateDatasource[],
    runtimeVersion: RuntimeVersion,
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block, runtimeVersion),
    );
  }

  getBlockHeight(block: LightBlockContent | BlockContent): number {
    return block.block.block.header.number.toNumber();
  }

  getBlockHash(block: LightBlockContent | BlockContent): string {
    return block.block.block.header.hash.toHex();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(
    block: LightBlockContent | BlockContent,
    runtimeVersion: RuntimeVersion,
  ): Promise<ApiAt> {
    return this.apiService.getPatchedApi(
      block.block.block.header,
      runtimeVersion,
    );
  }

  protected async indexBlockData(
    blockContent: LightBlockContent | BlockContent,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    if (isFullBlock(blockContent)) {
      const { block, events, extrinsics } = blockContent;
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
    } else {
      for (const event of blockContent.events) {
        await this.indexEvent(event, dataSources, getVM);
      }
    }
  }

  private async indexBlockContent(
    block: SubstrateBlock,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexExtrinsic(
    extrinsic: SubstrateExtrinsic,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Call, extrinsic, ds, getVM);
    }
  }

  private async indexEvent(
    event: SubstrateEvent | LightSubstrateEvent,
    dataSources: SubstrateProjectDs[],
    getVM: (d: SubstrateProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Event, event, ds, getVM);
    }
  }

  protected async prepareFilteredData<T = any>(
    kind: SubstrateHandlerKind,
    data: T,
  ): Promise<T> {
    // Substrate doesn't need to do anything here
    return Promise.resolve(data);
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
  [SubstrateHandlerKind.Block]: (
    block: SubstrateBlock,
    filter?: SubstrateBlockFilter,
  ) => !!SubstrateUtil.filterBlock(block, filter),
  [SubstrateHandlerKind.Event]: SubstrateUtil.filterEvent,
  [SubstrateHandlerKind.Call]: SubstrateUtil.filterExtrinsic,
};
