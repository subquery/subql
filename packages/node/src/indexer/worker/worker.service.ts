// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { threadId } from 'node:worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  getLogger,
  IProjectService,
  ProcessBlockResponse,
  BaseWorkerService,
  IProjectUpgradeService,
} from '@subql/node-core';
import { SubqlCosmosDatasource } from '@subql/types-cosmos';
import { CosmosProjectDs } from '../../configure/SubqueryProject';
import { ApiService } from '../api.service';
import { IndexerManager } from '../indexer.manager';
import { BlockContent } from '../types';

export type FetchBlockResponse = {
  parentHash: string;
};

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

const logger = getLogger(`Worker Service #${threadId}`);

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent,
  FetchBlockResponse,
  SubqlCosmosDatasource
> {
  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
    @Inject('IProjectService')
    projectService: IProjectService<CosmosProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }

  protected async fetchChainBlock(
    heights: number,
    extra: {},
  ): Promise<BlockContent> {
    const [block] = await this.apiService.fetchBlocks([heights]);

    return block;
  }

  protected toBlockResponse(block: BlockContent): FetchBlockResponse {
    return {
      parentHash: block.block.header.lastBlockId.hash.toString(),
    };
  }

  protected async processFetchedBlock(
    block: BlockContent,
    dataSources: SubqlCosmosDatasource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }
}
