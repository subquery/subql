// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { getLogger, ExportService } from '@subql/node-core';
import { ExportModulo } from './export.modulo';

const logger = getLogger('CLI-export');
export async function exportInit(
  outPath: string,
  entities: string[],
): Promise<void> {
  try {
    const app = await NestFactory.create(ExportModulo);
    await app.init();

    const exportService = app.get(ExportService);
    await exportService.run(outPath, entities);
  } catch (e) {
    logger.error(e, `Failed to export ${entities.join(',')} `);
    process.exit(1);
  }

  process.exit(0);
}
