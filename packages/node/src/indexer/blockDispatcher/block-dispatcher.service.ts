// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreCacheService,
  StoreService,
  IProjectService,
  PoiService,
  BlockDispatcher,
  ProcessBlockResponse,
} from '@subql/node-core';
import { Sequelize, Transaction } from 'sequelize';
import {
  SubqlProjectDs,
  SubqueryProject,
} from '../../configure/SubqueryProject';
import * as SubstrateUtil from '../../utils/substrate';
import { ApiService } from '../api.service';
import { DynamicDsService } from '../dynamic-ds.service';
import { IndexerManager } from '../indexer.manager';
import { RuntimeService } from '../runtime/runtimeService';
import { BlockContent } from '../types';
import { UnfinalizedBlocksService } from '../unfinalizedBlocks.service';

/**
 * @description Intended to behave the same as WorkerBlockDispatcherService but doesn't use worker threads or any parallel processing
 */
@Injectable()
export class BlockDispatcherService
  extends BlockDispatcher<BlockContent, SubqlProjectDs>
  implements OnApplicationShutdown
{
  private runtimeService: RuntimeService;

  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    private indexerManager: IndexerManager,
    eventEmitter: EventEmitter2,
    @Inject('IProjectService') projectService: IProjectService,
    storeService: StoreService,
    storeCacheService: StoreCacheService,
    sequelize: Sequelize,
    poiService: PoiService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    dynamicDsService: DynamicDsService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
  ) {
    const fetchBlockBatchesWrapped = async (
      blockNums: number[],
    ): Promise<BlockContent[]> => {
      const specChanged = await this.runtimeService.specChanged(
        blockNums[blockNums.length - 1],
      );

      // If specVersion not changed, a known overallSpecVer will be pass in
      // Otherwise use api to fetch runtimes
      return SubstrateUtil.fetchBlocksBatches(
        this.apiService.getApi(),
        blockNums,
        specChanged ? undefined : this.runtimeService.parentSpecVersion,
      );
    };

    super(
      nodeConfig,
      eventEmitter,
      projectService,
      storeService,
      storeCacheService,
      sequelize,
      poiService,
      project,
      dynamicDsService,
      fetchBlockBatchesWrapped,
    );
  }

  async init(
    onDynamicDsCreated: (height: number) => Promise<void>,
    runtimeService?: RuntimeService,
  ): Promise<void> {
    await super.init(onDynamicDsCreated);
    this.runtimeService = runtimeService;
  }

  protected getBlockHeight(block: BlockContent): number {
    return block.block.block.header.number.toNumber();
  }

  protected prepareTx(tx: Transaction): void {
    this.unfinalizedBlocksService.setTransaction(tx);
  }

  protected async indexBlock(
    block: BlockContent,
  ): Promise<ProcessBlockResponse> {
    const runtimeVersion = await this.runtimeService.getRuntimeVersion(
      block.block,
    );

    return this.indexerManager.indexBlock(block, runtimeVersion);
  }
}
