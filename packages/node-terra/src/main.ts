// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IndexerTerraManager } from './indexer/indexerterra.manager';
import { getLogger, NestLogger } from './utils/logger';
import { argv } from './yargs';
const logger = getLogger('subql-node-terra');

async function bootstrap() {
  const debug = argv('debug');
  const port = argv('port') as number;
  if (argv('unsafe')) {
    logger.warn(
      'UNSAFE MODE IS ENABLED. This is not recommended for most projects and will not be supported by our hosted service',
    );
  }

  try {
    const app = await NestFactory.create(AppModule, {
      logger: debug ? new NestLogger() : false,
    });
    await app.init();

    const indexerManager = app.get(IndexerTerraManager);
    await indexerManager.start();
    await app.listen(port);

    logger.info(`node started on port: ${port}`);
  } catch (e) {
    logger.error(e, 'node failed to start');
    process.exit(1);
  }
}

void bootstrap();
