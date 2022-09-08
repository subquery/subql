// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { findAvailablePort } from '@subql/common';
import { getLogger } from '@subql/node-core';
import { ForceCleanModule } from './forceClean.module';
import { ForceCleanService } from './forceClean.service';

const DEFAULT_PORT = 3000;

const logger = getLogger('CLI');
export async function forceCleanInit() {
  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port =
    validate(DEFAULT_PORT) ?? (await findAvailablePort(DEFAULT_PORT));

  try {
    const app = await NestFactory.create(ForceCleanModule);

    await app.init();
    const subcommandService = app.get(ForceCleanService);
    await subcommandService.forceClean();

    await app.listen(port);
  } catch (e) {
    logger.error(e, 'Force-clean failed to execute');
    process.exit(1);
  }

  process.exit(0);
}
