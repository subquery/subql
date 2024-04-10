// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { ApiService, getLogger, NestLogger } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { ProjectService } from '../indexer/project.service';
import { StellarApiService } from '../stellar';
import { TestingModule } from './testing.module';
import { TestingService } from './testing.service';

const logger = getLogger('Testing');
export async function testingInit(): Promise<void> {
  try {
    const { nodeConfig, project } = await ConfigureModule.getInstance();

    const testingService = new TestingService(nodeConfig, project);
    await testingService.run();
  } catch (e) {
    logger.error(e, 'Testing failed');
    process.exit(1);
  }
  process.exit(0);
}
