// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NestFactory} from '@nestjs/core';
import {notifyUpdates} from '@subql/common';
import {findAvailablePort} from '@subql/utils';
import {AppModule} from './app.module';
import {getLogger, NestLogger} from './utils/logger';
import {getYargsOption} from './yargs';

const pjson = require('../package.json');

const DEFAULT_PORT = 3000;

const {argv} = getYargsOption();
const logger = getLogger('subql-query');

notifyUpdates(pjson, logger);

void (async () => {
  const app = await NestFactory.create(AppModule, {
    logger: new NestLogger(),
  });

  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port = validate(process.env.PORT) ?? validate(argv.port) ?? (await findAvailablePort(DEFAULT_PORT));
  if (!port) {
    logger.error(
      `Unable to find available port (tried ports in range (${DEFAULT_PORT}..${
        DEFAULT_PORT + 10
      })). Try setting a free port manually by setting the PORT environment variable or by setting the --port flag`
    );
    process.exit(1);
  }

  if (argv.playground) {
    logger.info(`Started playground at http://localhost:${port}`);
  }

  await app.listen(port);
})();
