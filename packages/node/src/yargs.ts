// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getYargsOption() {
  return yargs(hideBin(process.argv)).options({
    subquery: {
      alias: 'f',
      demandOption: false,
      describe: 'the local path of subquery project',
      type: 'string',
    },
    'subquery-name': {
      demandOption: false,
      describe: 'name of the subquery project',
      type: 'string',
    },
    config: {
      alias: 'c',
      demandOption: false,
      describe: 'specify configuration file',
      type: 'string',
    },
    local: {
      type: 'boolean',
      demandOption: false,
      describe: 'use local mode',
    },
    'batch-size': {
      demandOption: false,
      describe: 'batch size of blocks to fetch in one round',
      type: 'number',
    },
    debug: {
      demandOption: false,
      describe: 'show debug information to console output',
      type: 'boolean',
      default: false,
    },
  });
}
