// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  TestingService as BaseTestingService,
  ApiService,
} from '@subql/node-core';
import { SorobanBlockWrapper } from '@subql/types-soroban';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { IndexerManager } from '../indexer/indexer.manager';
import { SorobanApi } from '../soroban';
import SafeSorobanProvider from '../soroban/safe-api';

@Injectable()
export class TestingService extends BaseTestingService<
  SorobanApi,
  SafeSorobanProvider,
  SorobanBlockWrapper,
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

  async indexBlock(block: SorobanBlockWrapper, handler: string): Promise<void> {
    await this.indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
