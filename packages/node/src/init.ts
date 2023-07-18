// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { getLogger, getValidPort, NestLogger } from '@subql/node-core';
import { AppModule } from './app.module';
import { ApiService } from './indexer/api.service';
import { FetchService } from './indexer/fetch.service';
import { ProjectService } from './indexer/project.service';
import { yargsOptions } from './yargs';
const pjson = require('../package.json');

const { argv } = yargsOptions;

const logger = getLogger('subql-node');

export async function bootstrap(): Promise<void> {
  logger.info(`Current ${pjson.name} version is ${pjson.version}`);
  const debug = argv.debug;
  const port = await getValidPort(argv.port);
  if (argv.unsafe) {
    logger.warn(
      'UNSAFE MODE IS ENABLED. This is not recommended for most projects and will not be supported by our hosted service',
    );
  }

  try {
    const app = await NestFactory.create(AppModule, {
      logger: debug ? new NestLogger() : false,
    });
    await app.init();

    const projectService: ProjectService = app.get('IProjectService');
    const fetchService = app.get(FetchService);
    const apiService = app.get(ApiService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await apiService.init();
    await projectService.init();
    await fetchService.init(projectService.startHeight);

    app.enableShutdownHooks();

    await app.listen(port);

    logger.info(`Node started on port: ${port}`);
  } catch (e) {
    logger.error(e, 'Node failed to start');
    process.exit(1);
  }
}
