// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { threadId } from 'node:worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { SubqlStellarDataSource } from '@subql/common-stellar';
import {
  NodeConfig,
  getLogger,
  IProjectService,
  ProcessBlockResponse,
  ApiService,
  BaseWorkerService,
  IProjectUpgradeService,
  IBlock,
  Header,
} from '@subql/node-core';
import { BlockWrapper, SubqlDatasource } from '@subql/types-stellar';
import { stellarBlockToHeader } from '../../stellar/utils.stellar';
import { IndexerManager } from '../indexer.manager';

export type FetchBlockResponse = Header;

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

const logger = getLogger(`Worker Service #${threadId}`);

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockWrapper,
  FetchBlockResponse,
  SubqlStellarDataSource,
  {}
> {
  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
    @Inject('IProjectService')
    projectService: IProjectService<SubqlDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }
  protected async fetchChainBlock(
    heights: number,
    extra: {},
  ): Promise<IBlock<BlockWrapper>> {
    const [block] = await this.apiService.fetchBlocks([heights]);
    return block;
  }

  protected toBlockResponse(block: BlockWrapper): Header {
    return stellarBlockToHeader(block.block);
  }

  protected async processFetchedBlock(
    block: IBlock<BlockWrapper>,
    dataSources: SubqlStellarDataSource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }
}
