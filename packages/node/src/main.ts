// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { initLogger } from '@subql/node-core/logger';
import { yargsOptions } from './yargs';

const { argv } = yargsOptions;

// initLogger is imported from true path, to make sure getLogger (or other logger values that relies on logger) isn't initialised
initLogger(
  argv.debug,
  argv.outputFmt as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

// Lazy import, to allow logger to be initialised before bootstrap()
// As bootstrap runs services that requires logger
const { bootstrap } = require('./init');
const { forceCleanInit } = require('./subcommands/forceClean.init');
const { mmrMigrateInit } = require('./subcommands/mmrMigrate.init');
const { mmrRegenerateInit } = require('./subcommands/mmrRegenerate.init');
const { reindexInit } = require('./subcommands/reindex.init');
const { testingInit } = require('./subcommands/testing.init');

switch (argv._[0]) {
  case 'test':
    void testingInit();
    break;
  case 'mmr-migrate':
    void mmrMigrateInit(argv.direction);
    break;
  case 'mmr-regen':
    void mmrRegenerateInit(
      argv.probe,
      argv.resetOnly,
      argv.unsafe,
      argv.targetHeight,
    );
    break;
  case 'force-clean':
    void forceCleanInit();
    break;
  case 'reindex':
    void reindexInit(argv.targetHeight);
    break;
  default:
    void bootstrap();
}
