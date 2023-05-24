// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { findAvailablePort } from '@subql/common';
import { getLogger, MmrRegenerateService } from '@subql/node-core';
import { yargsOptions } from '../yargs';
import { MmrRegenerateModule } from './mmrRegenerate.module';

const logger = getLogger('MMR-Regeneration');

const DEFAULT_PORT = 3000;
const { argv } = yargsOptions;

export async function mmrRegenerateInit(
  probeMode = false,
  resetOnly = false,
  unsafe = false,
  targetHeight?: number,
): Promise<void> {
  try {
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

    const app = await NestFactory.create(MmrRegenerateModule);
    await app.init();
    const mmrRegenerateService = app.get(MmrRegenerateService);
    await app.listen(port);
    await mmrRegenerateService.init();
    if (!probeMode) {
      await mmrRegenerateService.regenerate(targetHeight, resetOnly, unsafe);
    }
  } catch (e) {
    logger.error(e, 'Re-generate MMR failed to execute');
    process.exit(1);
  }
  process.exit(0);
}
