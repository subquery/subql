// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NestLogger,
  NodeConfig,
  TestingService as BaseTestingService,
  TestRunner,
} from '@subql/node-core';
import { CosmosProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { CosmosClient, CosmosSafeClient } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { BlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  CosmosClient,
  CosmosSafeClient,
  BlockContent,
  CosmosProjectDs
> {
  constructor(
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(nodeConfig, project);
  }

  async getTestRunner(): Promise<
    [
      close: () => Promise<void>,
      runner: TestRunner<
        CosmosClient,
        CosmosSafeClient,
        BlockContent,
        CosmosProjectDs
      >,
    ]
  > {
    const testContext = await NestFactory.createApplicationContext(
      TestingModule,
      {
        logger: new NestLogger(),
      },
    );

    await testContext.init();

    const projectService: ProjectService = testContext.get('IProjectService');
    await projectService.init();

    return [testContext.close.bind(testContext), testContext.get(TestRunner)];
  }

  async indexBlock(
    block: BlockContent,
    handler: string,
    indexerManager: IndexerManager,
  ): Promise<void> {
    await indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
