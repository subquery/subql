// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { ApiService, getLogger, NestLogger } from '@subql/node-core';
import { EthereumApiService } from '../ethereum';
import { ProjectService } from '../indexer/project.service';
import { TestingModule } from './testing.module';
import { TestingService } from './testing.service';

const logger = getLogger('Testing');
export async function testingInit(): Promise<void> {
  try {
    const app = await NestFactory.create(TestingModule, {
      logger: new NestLogger(),
    });

    await app.init();
    const projectService = app.get(ProjectService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await projectService.init();

    const testingService = app.get(TestingService);
    await testingService.init();
    await testingService.run();
  } catch (e) {
    logger.error(e, 'Testing failed');
    process.exit(1);
  }
  process.exit(0);
}
