// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NestFactory} from '@nestjs/core';
import {findAvailablePort} from '@subql/common';
import {AppModule} from './app.module';
import {getLogger, NestLogger} from './utils/logger';
import {getYargsOption} from './yargs';

const {argv} = getYargsOption();

void (async () => {
  const app = await NestFactory.create(AppModule, {
    logger: new NestLogger(),
  });
  const candidatePort = parseInt(process.env.PORT) ?? argv.port;
  const port = await findAvailablePort(candidatePort);

  if (!port) {
    const logger = getLogger('configure');
    logger.error(
      `Unable to find available port (tried ports in range (${candidatePort}..${
        candidatePort + 10
      })). Try setting a free port manually by setting the PORT environment variable or by setting the --port flag`
    );
    process.exit(1);
  }

  await app.listen(port);
})();
