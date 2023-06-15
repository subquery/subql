// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  TestingService as BaseTestingService,
  ApiService,
} from '@subql/node-core';
import { EthereumBlockWrapper } from '@subql/types-ethereum';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { EthereumApi } from '../ethereum';
import SafeEthProvider from '../ethereum/safe-api';
import { IndexerManager } from '../indexer/indexer.manager';

@Injectable()
export class TestingService extends BaseTestingService<
  EthereumApi,
  SafeEthProvider,
  EthereumBlockWrapper,
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

  async indexBlock(
    block: EthereumBlockWrapper,
    handler: string,
  ): Promise<void> {
    await this.indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
