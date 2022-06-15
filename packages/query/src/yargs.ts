// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {argv as yargv} from 'yargs';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getYargsOption() {
  return yargs(hideBin(process.argv)).options({
    name: {
      demandOption: true,
      alias: 'n',
      describe: 'Project name',
      type: 'string',
    },
    playground: {
      demandOption: false,
      describe: 'Enable graphql playground',
      type: 'boolean',
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
    'log-path': {
      demandOption: false,
      describe: 'Path to create log file e.g ./src/name.log',
      type: 'string',
    },
    'log-rotate': {
      demandOption: false,
      describe: 'Rotate log files in directory specified by log-path',
      type: 'boolean',
      default: false,
    },
    indexer: {
      demandOption: false,
      describe: 'Url that allows query to access indexer metadata',
      type: 'string',
    },
    unsafe: {
      demandOption: false,
      describe: 'Disable limits on query depth and allowable number returned query records',
      type: 'boolean',
    },
    subscription: {
      demandOption: false,
      describe: 'Enable subscription service',
      type: 'boolean',
      default: false,
    },
    port: {
      alias: 'p',
      demandOption: false,
      describe: 'The port the service will bind to',
      type: 'number',
    },
    'query-complexity': {
      demandOption: false,
      describe: 'Level of query complexity',
      type: 'number',
    },
    'max-connection': {
      demandOption: false,
      describe: 'Max connection to pg pool',
      type: 'number',
    },
    'query-timeout': {
      demandOption: false,
      describe: 'Query timeout in milliseconds',
      type: 'number',
    },
  });
}

export function argv(arg: string): unknown {
  return yargv[arg];
}
