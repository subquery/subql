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
  ProjectService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiAt, BlockContent, LightBlockContent } from '../indexer/types';
import { TestingModule } from './testing.module';

@Injectable()
export class TestingService extends BaseTestingService<
  ApiPromise,
  ApiAt,
  BlockContent | LightBlockContent,
  SubstrateDatasource
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
      runner: TestRunner<ApiPromise, ApiAt, BlockContent, SubstrateDatasource>,
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
}
