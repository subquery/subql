// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
  IBlock,
} from '@subql/node-core';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { EthereumApi } from '../ethereum';
import SafeEthProvider from '../ethereum/safe-api';
import { IndexerManager } from '../indexer/indexer.manager';
import { ProjectService } from '../indexer/project.service';
import { BlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  EthereumApi,
  SafeEthProvider,
  BlockContent,
  EthereumProjectDs
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
        EthereumApi,
        SafeEthProvider,
        BlockContent,
        EthereumProjectDs
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

    await projectService.init();

    return [testContext.close.bind(testContext), testContext.get(TestRunner)];
  }

  async indexBlock(
    block: IBlock<BlockContent>,
    handler: string,
    indexerManager: IndexerManager,
  ): Promise<void> {
    await indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }
}
