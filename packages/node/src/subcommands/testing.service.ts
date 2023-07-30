// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  TestingService as BaseTestingService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import {
  ApiService,
  CosmosClient,
  CosmosSafeClient,
} from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { BlockContent } from '../indexer/types';

@Injectable()
export class TestingService extends BaseTestingService<
  CosmosClient,
  CosmosSafeClient,
  BlockContent,
  SubqlProjectDs
> {
  constructor(
    sequelize: Sequelize,
    nodeConfig: NodeConfig,
    storeService: StoreService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    apiService: ApiService,
    indexerManager: IndexerManager,
  ) {
    super(
      sequelize,
      nodeConfig,
      storeService,
      project,
      apiService,
      indexerManager,
    );
  }

  async indexBlock(block: BlockContent, handler: string): Promise<void> {
    await this.indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
