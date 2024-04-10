// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { initLogger } from '@subql/node-core/logger';
import { yargsOptions } from './yargs';

const { argv } = yargsOptions;

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// initLogger is imported from true path, to make sure getLogger (or other logger values that relies on logger) isn't initialised
initLogger(
  argv.debug,
  argv.outputFmt as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

if (!argv._[0]) {
  // Lazy import, to allow logger to be initialised before bootstrap()
  // As bootstrap runs services that requires logger
  const { bootstrap } = require('./init');
  void bootstrap();
}
