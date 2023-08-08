// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  SubqlStellarCustomDataSource,
  StellarHandlerKind,
  StellarRuntimeHandlerInputMap,
  SubqlStellarDataSource,
} from '@subql/common-stellar';
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
  StellarEvent,
  StellarEventFilter,
  StellarBlockWrapper,
  SubqlDatasource,
} from '@subql/types-stellar';
import { SubqlProjectDs } from '../configure/SubqueryProject';
import { StellarApi } from '../stellar';
import { StellarBlockWrapped } from '../stellar/block.stellar';
import SafeStellarProvider from '../stellar/safe-api';
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
  SafeStellarProvider,
  StellarApi,
  StellarBlockWrapper,
  ApiService,
  SubqlStellarDataSource,
  SubqlStellarCustomDataSource,
  typeof FilterTypeMap,
  typeof ProcessorTypeMap,
  StellarRuntimeHandlerInputMap
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
    block: StellarBlockWrapper,
    dataSources: SubqlStellarDataSource[],
  ): Promise<ProcessBlockResponse> {
    return super.internalIndexBlock(block, dataSources, () =>
      this.getApi(block),
    );
  }

  getBlockHeight(block: StellarBlockWrapper): number {
    return block.block.ledger;
  }

  getBlockHash(block: StellarBlockWrapper): string {
    return block.block.hash;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  private async getApi(
    block: StellarBlockWrapper,
  ): Promise<SafeStellarProvider> {
    // return this.apiService.safeApi(this.getBlockHeight(block));
    return null;
  }

  protected async indexBlockData(
    { events }: StellarBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const event of events) {
      await this.indexEvent(event, dataSources, getVM);
    }
  }

  private async indexEvent(
    event: StellarEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(StellarHandlerKind.Event, event, ds, getVM);
    }
  }

  protected async prepareFilteredData<T = any>(
    kind: StellarHandlerKind,
    data: T,
    ds: SubqlDatasource,
  ): Promise<T> {
    return Promise.resolve(data);
  }
}

type ProcessorTypeMap = {
  [StellarHandlerKind.Event]: typeof isEventHandlerProcessor;
};

const ProcessorTypeMap = {
  [StellarHandlerKind.Event]: isEventHandlerProcessor,
};

const FilterTypeMap = {
  [StellarHandlerKind.Event]: (
    data: StellarEvent,
    filter: StellarEventFilter,
    ds: SubqlStellarDataSource,
  ) =>
    StellarBlockWrapped.filterEventProcessor(data, filter, ds.options?.address),
};
