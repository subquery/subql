// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, statSync } from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  getLogger,
  TestingService as BaseTestingService,
} from '@subql/node-core';
import { Sequelize } from 'sequelize';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';

const logger = getLogger('subql-testing');

@Injectable()
export class TestingService extends BaseTestingService {
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

  async indexBlock(block: any, handler: string): Promise<void> {
    const runtimeVersion =
      await this.apiService.api.rpc.state.getRuntimeVersion(
        block.block.block.header.hash,
      );

    await this.indexerManager.indexBlock(
      block,
      runtimeVersion,
      this.getDsWithHandler(handler),
    );
  }
}
