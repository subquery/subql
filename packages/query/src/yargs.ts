// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {argv as yargv} from 'yargs';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getYargsOption() {
  return yargs(hideBin(process.argv)).options({
    name: {
      alias: 'n',
      describe: 'project name',
      type: 'string',
      demandOption: true,
    },
    playground: {
      describe: 'enable graphql playground',
      type: 'boolean',
      demandOption: false,
    },
    'output-fmt': {
      demandOption: false,
      describe: 'Print log as json or plain text',
      type: 'string',
      default: 'colored',
      choices: ['json', 'colored'],
    },
    'log-level': {
      demandOption: false,
      describe: 'Specify log level to print.',
      type: 'string',
      default: 'info',
      choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    },
    indexer: {
      demandOption: false,
      describe: 'Url that allow query to access indexer metadata',
      type: 'string',
    },
    unsafe: {
      demandOption: false,
      describe: 'Disable limits on query depth and allowable number returned query records',
      type: 'boolean',
    },
  });
}

export function argv(arg: string): unknown {
  return yargv[arg];
}
