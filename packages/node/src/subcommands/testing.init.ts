// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { exitWithError, getLogger } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { TestingService } from './testing.service';

const logger = getLogger('Testing');
export async function testingInit(): Promise<void> {
  try {
    const { nodeConfig, project } = await ConfigureModule.getInstance();

    const testingService = new TestingService(nodeConfig, project);
    await testingService.run();
  } catch (e) {
    exitWithError(new Error('Testing failed', { cause: e }), logger);
  }
  process.exit(0);
}
