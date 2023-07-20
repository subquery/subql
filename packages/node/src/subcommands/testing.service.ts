// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiPromise } from '@polkadot/api';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
} from '@subql/node-core';
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

  async getTestRunner(): Promise<
    TestRunner<ApiPromise, ApiAt, BlockContent, SubqlProjectDs>
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
    await apiService.init();
    await projectService.init();

    return testContext.get(TestRunner);
  }

  async indexBlock(
    block: BlockContent,
    handler: string,
    indexerManager: IndexerManager,
    apiService: ApiService,
  ): Promise<void> {
    const runtimeVersion =
      await apiService.unsafeApi.rpc.state.getRuntimeVersion(
        block.block.block.header.hash,
      );

    await indexerManager.indexBlock(
      block,
      this.getDsWithHandler(handler),
      runtimeVersion,
    );
  }
}
