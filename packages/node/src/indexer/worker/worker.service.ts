// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { SubqlEthereumDataSource } from '@subql/common-ethereum';
import {
  NodeConfig,
  IProjectService,
  ProcessBlockResponse,
  ApiService,
  BaseWorkerService,
  IProjectUpgradeService,
  IBlock,
  Header,
} from '@subql/node-core';
import { EthereumProjectDs } from '../../configure/SubqueryProject';
import { EthereumApi } from '../../ethereum';
import SafeEthProvider from '../../ethereum/safe-api';
import { ethereumBlockToHeader } from '../../ethereum/utils.ethereum';
import { IndexerManager } from '../indexer.manager';
import { BlockContent, getBlockSize } from '../types';

export type FetchBlockResponse = Header;

export type WorkerStatusResponse = {
  threadId: number;
  isIndexing: boolean;
  fetchedBlocks: number;
  toFetchBlocks: number;
};

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent,
  FetchBlockResponse,
  SubqlEthereumDataSource,
  {}
> {
  constructor(
    @Inject('APIService')
    private apiService: ApiService<
      EthereumApi,
      SafeEthProvider,
      IBlock<BlockContent>[]
    >,
    private indexerManager: IndexerManager,
    @Inject('IProjectService')
    projectService: IProjectService<EthereumProjectDs>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }

  protected async fetchChainBlock(
    heights: number,
    extra: {},
  ): Promise<IBlock<BlockContent>> {
    const [block] = await this.apiService.fetchBlocks([heights]);
    return block;
  }

  protected toBlockResponse(block: BlockContent): Header {
    return {
      ...ethereumBlockToHeader(block),
      parentHash: block.parentHash,
    };
  }

  protected async processFetchedBlock(
    block: IBlock<BlockContent>,
    dataSources: SubqlEthereumDataSource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }

  getBlockSize(block: IBlock<BlockContent>): number {
    return getBlockSize(block.block);
  }
}
