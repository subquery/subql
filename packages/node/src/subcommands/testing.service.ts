// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiPromise } from '@polkadot/api';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
  SubqlProjectDs,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { IBlock } from '@subql/types-core';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { ApiAt, BlockContent, LightBlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  ApiPromise,
  ApiAt,
  BlockContent | LightBlockContent,
  SubqlProjectDs<SubstrateDatasource>
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
        ApiPromise,
        ApiAt,
        BlockContent,
        SubqlProjectDs<SubstrateDatasource>
      >,
    ]
  > {
    const testContext = await NestFactory.createApplicationContext(
      TestingModule,
      {
        logger: new NestLogger(!!this.nodeConfig.debug),
      },
    );

    await testContext.init();

    const projectService: ProjectService = testContext.get('IProjectService');
    const apiService = testContext.get(ApiService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await apiService.init();
    await projectService.init();

    return [testContext.close.bind(testContext), testContext.get(TestRunner)];
  }

  async indexBlock(
    block: IBlock<BlockContent | LightBlockContent>,
    handler: string,
    indexerManager: IndexerManager,
    apiService: ApiService,
  ): Promise<void> {
    const runtimeVersion =
      await apiService.unsafeApi.rpc.state.getRuntimeVersion(
        block.block.block.block.header.hash,
      );

    await indexerManager.indexBlock(
      block,
      this.getDsWithHandler(handler),
      runtimeVersion,
    );
  }
}
