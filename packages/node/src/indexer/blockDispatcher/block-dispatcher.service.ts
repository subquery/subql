// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  IStoreModelProvider,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  ApiService,
  IProjectUpgradeService,
  PoiSyncService,
  IBlock,
} from '@subql/node-core';
import { StellarBlockWrapper, SubqlDatasource } from '@subql/types-stellar';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { IndexerManager } from '../indexer.manager';
import { getBlockSize } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<StellarBlockWrapper, SubqlDatasource>
  implements OnApplicationShutdown
{
  constructor(
    apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubqlDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeModelProvider,
      poiSyncService,
      project,
      apiService.fetchBlocks.bind(apiService),
    );
  }

  protected async indexBlock(
    block: IBlock<StellarBlockWrapper>,
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(block.getHeader().blockHeight),
    );
  }

  protected getBlockSize(block: IBlock<StellarBlockWrapper>): number {
    return getBlockSize(block.block);
  }
}
