// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { findAvailablePort } from '@subql/common';
import { getLogger, ApiService, NestLogger } from '@subql/node-core';
import { AppModule } from './app.module';
import { FetchService } from './indexer/fetch.service';
import { ProjectService } from './indexer/project.service';
import { yargsOptions } from './yargs';
const pjson = require('../package.json');

const { argv } = yargsOptions;

const DEFAULT_PORT = 3000;
const logger = getLogger('subql-node');

export async function bootstrap() {
  logger.info(`Current ${pjson.name} version is ${pjson.version}`);
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

  try {
    const app = await NestFactory.create(AppModule, {
      logger: debug ? new NestLogger() : false,
    });
    await app.init();

    const projectService = app.get(ProjectService);
    const fetchService = app.get(FetchService);
    const apiService = app.get(ApiService);

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await apiService.init();
    await projectService.init();
    await fetchService.init(projectService.startHeight);

    await app.listen(port);

    logger.info(`Node started on port: ${port}`);
  } catch (e) {
    logger.error(e, 'Node failed to start');
    process.exit(1);
  }
}
