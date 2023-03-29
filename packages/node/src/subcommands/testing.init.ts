// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { getLogger, NestLogger } from '@subql/node-core';
import { TestingModule } from './testing.module';
import { TestingService } from './testing.service';

const logger = getLogger('CLI-Testing');
export async function testingInit(): Promise<void> {
  try {
    const app = await NestFactory.create(TestingModule, {
      logger: new NestLogger(),
    });

    await app.init();
    const testingService = app.get(TestingService);

    await testingService.init();

    // TODO call function to run tests
    await testingService.run();
  } catch (e) {
    logger.error(e, 'Testing failed');
    process.exit(1);
  }
  process.exit(0);
}
