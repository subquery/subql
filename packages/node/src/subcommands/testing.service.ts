// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  getLogger,
  TestingService as BaseTestingService,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { BlockContent } from '../indexer/types';

const logger = getLogger('subql-testing');

@Injectable()
export class TestingService extends BaseTestingService<
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
    const runtimeVersion =
      await this.apiService.api.rpc.state.getRuntimeVersion(
        block.block.block.header.hash,
      );

    await this.indexerManager.indexBlock(
      block,
      this.getDsWithHandler(handler),
      runtimeVersion,
    );
  }
}
