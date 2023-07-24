// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  TestRunner,
  NestLogger,
  ApiService,
} from '@subql/node-core';
import { SorobanBlockWrapper } from '@subql/types-soroban';
import { Sequelize } from '@subql/x-sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { SorobanApi, SorobanApiService } from '../soroban';
import SafeSorobanProvider from '../soroban/safe-api';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  SorobanApi,
  SafeSorobanProvider,
  SorobanBlockWrapper,
  SubqlProjectDs
> {
  constructor(
    nodeConfig: NodeConfig,
    @Inject('ISubqueryProject') project: SubqueryProject,
  ) {
    super(nodeConfig, project);
  }

  async getTestRunner(): Promise<
    TestRunner<
      SorobanApi,
      SafeSorobanProvider,
      SorobanBlockWrapper,
      SubqlProjectDs
    >
  > {
    const testContext = await NestFactory.createApplicationContext(
      TestingModule,
      {
        logger: new NestLogger(),
      },
    );

    await testContext.init();

    const projectService: ProjectService = testContext.get(ProjectService);
    const apiService = testContext.get(ApiService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await (apiService as SorobanApiService).init();

    return testContext.get(TestRunner);
  }

  async indexBlock(
    block: SorobanBlockWrapper,
    handler: string,
    indexerManager: IndexerManager,
  ): Promise<void> {
    await indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
