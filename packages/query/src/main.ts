// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NestFactory} from '@nestjs/core';
import detectPort from 'detect-port';
import {AppModule} from './app.module';
import {getLogger, NestLogger} from './utils/logger';
import {getYargsOption} from './yargs';

async function findAvailablePort(startPort: number, range = 10): Promise<number> {
  for (let port = startPort; port <= startPort + range; port++) {
    try {
      const _port = await detectPort(port);
      if (_port === port) {
        return port;
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}


const DEFAULT_PORT = 3000;
const {argv} = getYargsOption();

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
    getLogger('subql-query').error(
      `Unable to find available port (tried ports in range (${DEFAULT_PORT}..${
        DEFAULT_PORT + 10
      })). Try setting a free port manually by setting the PORT environment variable or by setting the --port flag`
    );
    process.exit(1);
  }

  if (argv.playground) {
    getLogger('subql-query').info(`Started playground at http://localhost:${port}`);
  }

  await app.listen(port);
})();
