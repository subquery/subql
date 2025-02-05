// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// initlogger and yargs must be imported before all other imports
// making sure logger is defined before its called
// eslint-disable-next-line import/order
import { initLogger } from '@subql/node-core/logger';
// eslint-disable-next-line import/order
import { yargsOptions } from '../../yargs';

const { argv } = yargsOptions;

initLogger(
  argv.debug,
  argv.outputFmt as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

import { threadId } from 'node:worker_threads';
import { NestFactory } from '@nestjs/core';
import {
  getLogger,
  NestLogger,
  initWorkerServices,
  IBaseIndexerWorker,
  createWorkerHost,
} from '@subql/node-core';
import { ProjectService } from '../project.service';
import { WorkerModule } from './worker.module';
import { WorkerService } from './worker.service';

const logger = getLogger(`worker #${threadId}`);

async function initWorker(startHeight?: number): Promise<void> {
  try {
    const app = await NestFactory.create(WorkerModule, {
      logger: new NestLogger(!!argv.debug), // TIP: If the worker is crashing comment out this line for better logging
    });

    await app.init();

    const projectService: ProjectService = app.get('IProjectService');
    // Initialise async services, we do this here rather than in factories so we can capture one off events
    await projectService.init(startHeight);

    const workerService = app.get(WorkerService);

    initWorkerServices(app, workerService);
  } catch (e: any) {
    console.log('Failed to start worker', e);
    logger.error(e, 'Failed to start worker');
    throw e;
  }
}
export type IIndexerWorker = IBaseIndexerWorker;

(global as any).host = createWorkerHost([], {
  initWorker,
});
