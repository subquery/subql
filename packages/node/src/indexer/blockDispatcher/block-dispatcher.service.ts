// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreCacheService,
  StoreService,
  IProjectService,
  BlockDispatcher,
  ProcessBlockResponse,
  IProjectUpgradeService,
  PoiSyncService,
  IBlock,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
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
  private _runtimeService?: RuntimeService;

  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService')
    projectService: IProjectService<SubstrateDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    poiSyncService: PoiSyncService,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(
      nodeConfig,
      eventEmitter,
      projectService,
      projectUpgradeService,
      storeService,
      storeCacheService,
      poiSyncService,
      project,
      async (
        blockNums: number[],
      ): Promise<IBlock<BlockContent>[] | IBlock<LightBlockContent>[]> => {
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

  private get runtimeService(): RuntimeService {
    assert(this._runtimeService, 'Runtime service not initialized');
    return this._runtimeService;
  }
  private set runtimeService(value: RuntimeService) {
    this._runtimeService = value;
  }

  async init(
    onDynamicDsCreated: (height: number) => void,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    if (runtimeService) this.runtimeService = runtimeService;
  }

  protected async indexBlock(
    block: IBlock<BlockContent> | IBlock<LightBlockContent>,
  ): Promise<ProcessBlockResponse> {
    const runtimeVersion = !isFullBlock(block.block)
      ? undefined
      : await this.runtimeService.getRuntimeVersion(block.block.block);

    return this.indexerManager.indexBlock(
      block,
      await this.projectService.getDataSources(block.getHeader().blockHeight),
      runtimeVersion,
    );
  }
}
