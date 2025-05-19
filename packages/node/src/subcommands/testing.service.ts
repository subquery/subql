// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiPromise } from '@polkadot/api';
import {
  NodeConfig,
  TestingService as BaseTestingService,
  NestLogger,
  TestRunner,
  ProjectService,
  DbModule,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { ConfigureModule } from '../configure/configure.module';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiAt, BlockContent, LightBlockContent } from '../indexer/types';
import { TestingFeatureModule } from './testing.module';

@Module({
  imports: [
    DbModule.forRoot(),
    ConfigureModule.register(),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TestingFeatureModule,
  ],
  controllers: [],
})
export class TestingModule {}

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
