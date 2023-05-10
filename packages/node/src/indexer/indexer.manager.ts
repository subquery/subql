// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
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
  SubstrateBlock,
  SubstrateBlockFilter,
  SubstrateDatasource,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import * as SubstrateUtil from '../utils/substrate';
import { yargsOptions } from '../yargs';
import { ApiService } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { SandboxService } from './sandbox.service';
import { ApiAt, BlockContent } from './types';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager extends BaseIndexerManager<
  ApiService,
  ApiAt,
  BlockContent,
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
    dataSources: SubstrateDatasource[],
    runtimeVersion: RuntimeVersion,
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block, runtimeVersion),
    );
  }

  getBlockHeight(block: BlockContent): number {
    return block.block.block.header.number.toNumber();
  }

  getBlockHash(block: BlockContent): string {
    return block.block.block.header.hash.toHex();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(
    block: BlockContent,
    runtimeVersion: RuntimeVersion,
  ): Promise<ApiAt> {
    return this.apiService.getPatchedApi(block.block, runtimeVersion);
  }

  protected async indexBlockData(
    { block, events, extrinsics }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
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
  }

  private async indexBlockContent(
    block: SubstrateBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexExtrinsic(
    extrinsic: SubstrateExtrinsic,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Call, extrinsic, ds, getVM);
    }
  }

  private async indexEvent(
    event: SubstrateEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Event, event, ds, getVM);
    }
  }

  protected baseCustomHandlerFilter(
    kind: SubstrateHandlerKind,
    data: any,
    baseFilter: any,
  ): boolean {
    switch (kind) {
      case SubstrateHandlerKind.Block:
        return !!SubstrateUtil.filterBlock(data as SubstrateBlock, baseFilter);
      case SubstrateHandlerKind.Call:
        return !!SubstrateUtil.filterExtrinsics(
          [data as SubstrateExtrinsic],
          baseFilter,
        ).length;
      case SubstrateHandlerKind.Event:
        return !!SubstrateUtil.filterEvents(
          [data as SubstrateEvent],
          baseFilter,
        ).length;
      default:
        throw new Error('Unsupported handler kind');
    }
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
