// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  SmartBatchService,
  StoreCacheService,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  IProjectUpgradeService,
  PoiSyncService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent, isFullBlock, LightBlockContent } from '../types';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent | LightBlockContent, SubstrateDatasource>
  implements OnApplicationShutdown
{
  private runtimeService: RuntimeService;

  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubstrateDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    smartBatchService: SmartBatchService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
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
      poiSyncService,
      project,
      dynamicDsService,
      async (
        blockNums: number[],
      ): Promise<BlockContent[] | LightBlockContent[]> => {
        const specChanged = await this.runtimeService.specChanged(
          blockNums[blockNums.length - 1],
        );

        // If specVersion not changed, a known overallSpecVer will be pass in
        // Otherwise use api to fetch runtimes
        return this.apiService.fetchBlocks(
          blockNums,
          specChanged ? undefined : this.runtimeService.parentSpecVersion,
        );
      },
    );
  }

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    this.runtimeService = runtimeService;
  }

  protected getBlockHeight(block: BlockContent | LightBlockContent): number {
    return block.block.block.header.number.toNumber();
  }

  protected async indexBlock(
    block: BlockContent | LightBlockContent,
  ): Promise<ProcessBlockResponse> {
    const runtimeVersion = !isFullBlock(block)
      ? undefined
      : await this.runtimeService.getRuntimeVersion(block.block);
    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(this.getBlockHeight(block)),
      runtimeVersion,
    );
  }
}
