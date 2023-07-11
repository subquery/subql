// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiPromise } from '@polkadot/api';
import {
  NodeConfig,
  StoreService,
  TestingService as BaseTestingService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { ApiAt, BlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  ApiPromise,
  ApiAt,
  BlockContent,
  SubqlProjectDs
> {
  constructor(
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(nodeConfig, project);
  }

  async createApp(): Promise<void> {
    this.app = await Test.createTestingModule(TestingModule).compile();

    await this.app.init();

    const projectService: ProjectService = this.app.get(ProjectService);
    this.apiService = this.app.get(ApiService);

    await (this.apiService as ApiService).init();
    await projectService.init();

    this.storeService = this.app.get(StoreService);
    this.sequelize = this.app.get(Sequelize);
    this.indexerManager = this.app.get(IndexerManager);
    this.nodeConfig = this.app.get(NodeConfig);
    this.project = this.app.get('ISubqueryProject');
  }

  async indexBlock(block: BlockContent, handler: string): Promise<void> {
    const runtimeVersion =
      await this.apiService.unsafeApi.rpc.state.getRuntimeVersion(
        block.block.block.header.hash,
      );

    await this.indexerManager.indexBlock(
      block,
      this.getDsWithHandler(handler),
      runtimeVersion,
    );
  }
}
