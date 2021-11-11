// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IndexerManager } from './indexer/indexer.manager';
import { getLogger, NestLogger } from './utils/logger';
import { argv } from './yargs';

const logger = getLogger('subql-node');

async function bootstrap() {
  const debug = argv('debug');
  const port = argv('port') as number;
  try {
    const app = await NestFactory.create(AppModule, {
      logger: debug ? new NestLogger() : false,
    });
    await app.init();
    const indexerManager = app.get(IndexerManager);
    await indexerManager.start();
    await app.listen(port);
    getLogger('subql-node').info(`node started on port: ${port}`);
  } catch (e) {
    logger.error(e, 'node failed to start');
    process.exit(1);
  }
}

void bootstrap();
