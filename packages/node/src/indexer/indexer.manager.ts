// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  SubqlSorobanCustomDataSource,
  SorobanHandlerKind,
  SorobanRuntimeHandlerInputMap,
  SubqlSorobanDataSource,
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
  SorobanEvent,
  SorobanEventFilter,
  SorobanBlockWrapper,
  SubqlDatasource,
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
    return block.block.height;
  }

  getBlockHash(block: SorobanBlockWrapper): string {
    return block.block.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(
    block: SorobanBlockWrapper,
  ): Promise<SafeSorobanProvider> {
    return this.apiService.safeApi(this.getBlockHeight(block));
  }

  protected async indexBlockData(
    { events }: SorobanBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const event of events) {
      await this.indexEvent(event, dataSources, getVM);
    }
  }

  private async indexEvent(
    event: SorobanEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SorobanHandlerKind.Event, event, ds, getVM);
    }
  }

  protected async prepareFilteredData<T = any>(
    kind: SorobanHandlerKind,
    data: T,
    ds: SubqlDatasource,
  ): Promise<T> {
    return Promise.resolve(data);
  }
}

type ProcessorTypeMap = {
  [SorobanHandlerKind.Event]: typeof isEventHandlerProcessor;
};

const ProcessorTypeMap = {
  [SorobanHandlerKind.Event]: isEventHandlerProcessor,
};

const FilterTypeMap = {
  [SorobanHandlerKind.Event]: (
    data: SorobanEvent,
    filter: SorobanEventFilter,
    ds: SubqlSorobanDataSource,
  ) =>
    SorobanBlockWrapped.filterEventProcessor(data, filter, ds.options?.address),
};
