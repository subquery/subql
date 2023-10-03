// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  SmartBatchService,
  StoreCacheService,
  StoreService,
  IProjectService,
  PoiService,
  BlockDispatcher,
  ProcessBlockResponse,
  IProjectUpgradeService,
} from '@subql/node-core';
import {
  CosmosProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, CosmosProjectDs>
  implements OnApplicationShutdown
{
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService<CosmosProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      smartBatchService,
      storeService,
      storeCacheService,
      poiService,
      project,
      dynamicDsService,
      async (blockNums: number[]): Promise<BlockContent[]> => {
        // If specVersion not changed, a known overallSpecVer will be pass in
        // Otherwise use api to fetch runtimes
        return this.apiService.fetchBlocks(blockNums);
      },
    );
  }

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
  }

  protected getBlockHeight(block: BlockContent): number {
    return block.block.block.header.height;
  }

  protected async indexBlock(
    block: BlockContent,
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(this.getBlockHeight(block)),
    );
  }
}
