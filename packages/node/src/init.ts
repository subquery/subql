// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { notifyUpdates } from '@subql/common';
import {
  exitWithError,
  getLogger,
  NestLogger,
  getValidPort,
  ProjectService,
  FetchService,
} from '@subql/node-core';
import { AppModule } from './app.module';
import { yargsOptions } from './yargs';
const pjson = require('../package.json');

const { argv } = yargsOptions;

const logger = getLogger('subql-node');

notifyUpdates(pjson, logger);

export async function bootstrap(): Promise<void> {
  logger.info(`Current ${pjson.name} version is ${pjson.version}`);

  const port = await getValidPort(argv.port);
  if (!port) {
    exitWithError(
      `Unable to find available port (tried ports in range (${port}..${
        port + 10
      })). Try setting a free port manually by setting the --port flag`,
      logger,
    );
  }

  if (argv.unsafe) {
    logger.warn(
      'UNSAFE MODE IS ENABLED. This is not recommended for most projects and will not be supported by our hosted service',
    );
  }

  try {
    const app = await NestFactory.create(AppModule, {
      logger: new NestLogger(!!argv.debug),
    });

    await app.init();

    const projectService: ProjectService = app.get('IProjectService');
    const fetchService = app.get(FetchService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off eventss
    await projectService.init();
    await fetchService.init(projectService.startHeight);

    app.enableShutdownHooks();

    await app.listen(port);

    logger.info(`Node started on port: ${port}`);
  } catch (e) {
    exitWithError(new Error('Node failed to start', { cause: e }), logger);
  }
}
