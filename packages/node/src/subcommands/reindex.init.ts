// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NestFactory } from '@nestjs/core';
import { getLogger } from '@subql/node-core';
import { ReindexModule } from './reindex.module';
import { ReindexService } from './reindex.service';

const logger = getLogger('CLI-Reindex');
export async function reindexInit(targetHeight: number): Promise<void> {
  try {
    const app = await NestFactory.create(ReindexModule);

    await app.init();
    const reindexService = app.get(ReindexService);
    await reindexService.reindex(targetHeight);
  } catch (e) {
    logger.error(e, 'Reindex failed to execute');
    process.exit(1);
  }
  process.exit(0);
}
