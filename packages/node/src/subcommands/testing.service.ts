// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  TestRunner,
  NestLogger,
} from '@subql/node-core';
import {
  BlockWrapper,
  StellarBlockWrapper,
  SubqlDatasource,
} from '@subql/types-stellar';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ProjectService } from '../indexer/project.service';
import { StellarApi } from '../stellar';
import SafeStellarProvider from '../stellar/safe-api';
import { TestingModule } from './testing.module';
@Injectable()
export class TestingService extends BaseTestingService<
  StellarApi,
  SafeStellarProvider,
  StellarBlockWrapper,
  SubqlDatasource
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
        StellarApi,
        SafeStellarProvider,
        BlockWrapper,
        SubqlDatasource
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
}
