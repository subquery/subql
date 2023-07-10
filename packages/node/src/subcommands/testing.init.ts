// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getLogger } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { TestingService } from './testing.service';

const logger = getLogger('Testing');
export async function testingInit(): Promise<void> {
  try {
    const { config, project } = await ConfigureModule.getInstance();
    const subqueryProject = await project();

    const testingService = new TestingService(config, subqueryProject);
    await testingService.init();
    await testingService.run();
  } catch (e) {
    logger.error(e, 'Testing failed');
    process.exit(1);
  }
  process.exit(0);
}
