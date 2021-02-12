// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getLogger, NestLogger } from './utils/logger';
import { argv } from './yargs';

async function bootstrap() {
  const debug = argv('debug');
  const app = await NestFactory.create(AppModule, {
    logger: debug ? new NestLogger() : false,
  });
  await app.listen(3000);
  getLogger('subql-node').info('node started');
}

void bootstrap();
