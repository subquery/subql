// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  Worker,
  isMainThread,
  threadId,
  workerData,
} from 'node:worker_threads';
import { NestFactory } from '@nestjs/core';
import { findAvailablePort } from '@subql/common';
import { AppModule } from './app.module';
import { IndexerManager } from './indexer/indexer.manager';
import { getLogger, NestLogger } from './utils/logger';
import { WorkerModule } from './worker.module';
import { getYargsOption } from './yargs';

const DEFAULT_PORT = 3000;
const logger = getLogger('subql-node');
const { argv } = getYargsOption();

async function bootstrap() {
  const debug = argv.debug;

  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port = validate(argv.port) ?? (await findAvailablePort(DEFAULT_PORT));
  if (!port) {
    logger.error(
      `Unable to find available port (tried ports in range (${port}..${
        port + 10
      })). Try setting a free port manually by setting the --port flag`,
    );
    process.exit(1);
  }

  if (argv.unsafe) {
    logger.warn(
      'UNSAFE MODE IS ENABLED. This is not recommended for most projects and will not be supported by our hosted service',
    );
  }
  if (isMainThread) {
    try {
      const app = await NestFactory.create(AppModule, {
        logger: debug ? new NestLogger() : false,
      });
      await app.init();

      const indexerManager = app.get(IndexerManager);
      // await indexerManager.start();
      await app.listen(port);

      logger.info(`Node started on port: ${port}`);
    } catch (e) {
      logger.error(e, 'Node failed to start');
      process.exit(1);
    }
    const worker = new Worker(__filename, {
      argv: process.argv,
    });
    worker.on('error', (err) => {
      logger.error('worker error');
    });
    worker.on('exit', (code) => {
      logger.error(`worker exit ${code}`);
    });
  } else {
    logger.info(`Node worker start`);
    try {
      const app = await NestFactory.createMicroservice(WorkerModule, {
        logger: debug ? new NestLogger() : false,
      });
      await app.init();
      logger.info(`Node worker ${threadId} started`);
      const indexerManager = app.get(IndexerManager);
      await indexerManager.start();
      await app.listen();
    } catch (e) {
      logger.error(e, `Node worker ${threadId} failed to start`);
      process.exit(1);
    }
  }
}

void bootstrap();
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:');
  // Recommended: send the information to sentry.io
  // or whatever crash reporting service you use
});
