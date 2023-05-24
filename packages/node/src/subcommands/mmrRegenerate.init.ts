// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import {
  getLogger,
  getValidPort,
  MmrRegenerateService,
} from '@subql/node-core';
import { yargsOptions } from '../yargs';
import { MmrRegenerateModule } from './mmrRegenerate.module';

const logger = getLogger('MMR-Regeneration');

const { argv } = yargsOptions;

export async function mmrRegenerateInit(
  probeMode = false,
  resetOnly = false,
  unsafe = false,
  targetHeight?: number,
): Promise<void> {
  try {
    const port = await getValidPort(argv.port);
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
