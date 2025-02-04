// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { NestFactory } from '@nestjs/core';
import { notifyUpdates } from '@subql/common';
import {
  exitWithError,
  getLogger,
  getValidPort,
  IBlockchainService,
  NestLogger,
  ProjectService,
  FetchService,
  DictionaryService,
} from '@subql/node-core';
import { AppModule } from './app.module';
import { SubstrateDictionaryService } from './indexer/dictionary';
import { RuntimeService } from './indexer/runtime/runtimeService';
import { yargsOptions } from './yargs';

const pjson = require('../package.json');

const { argv } = yargsOptions;

const logger = getLogger('subql-node');

notifyUpdates(pjson, logger);

export async function bootstrap(): Promise<void> {
  const port = await getValidPort(argv.port);

  try {
    const app = await NestFactory.create(AppModule, {
      logger: new NestLogger(!!argv.debug),
    });
    await app.init();

    const projectService: ProjectService = app.get('IProjectService');
    const fetchService = app.get(FetchService);
    const runtimeService: RuntimeService = app.get('RuntimeService');
    const dictionaryService: SubstrateDictionaryService =
      app.get(DictionaryService);
    const blockchainService: IBlockchainService = app.get('IBlockchainService');

    // Initialise async services, we do this here rather than in factories, so we can capture one off events
    await projectService.init();

    const startHeight = projectService.startHeight;
    const { blockHeight: finalizedHeight } =
      await blockchainService.getFinalizedHeader();
    await runtimeService.init(startHeight, finalizedHeight, dictionaryService);
    await fetchService.init(startHeight);

    app.enableShutdownHooks();

    await app.listen(port);

    logger.info(`Node started on port: ${port}`);
  } catch (e) {
    exitWithError(new Error(`Node failed to start`, { cause: e }), logger);
  }
}
