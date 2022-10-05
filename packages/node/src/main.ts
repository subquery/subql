// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { initLogger } from '@subql/node-core/logger';
import { yargsOptions } from './yargs';

const { argv } = yargsOptions;

// initLogger is imported from true path, to make sure getLogger (or other logger values that relies on logger) isn't initialised
initLogger(
  argv.debug,
  argv.outputFormat as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

// Lazy import, to allow logger to be initialised before bootstrap()
// As bootstrap runs services that requires logger
const { bootstrap } = require('./init');
void bootstrap();
