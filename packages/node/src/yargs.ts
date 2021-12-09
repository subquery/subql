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
      describe: 'Local path of the subquery project',
      type: 'string',
    },
    'subquery-name': {
      demandOption: false,
      describe: 'Name of the subquery project',
      type: 'string',
    },
    config: {
      alias: 'c',
      demandOption: false,
      describe: 'Specify configuration file',
      type: 'string',
    },
    local: {
      type: 'boolean',
      demandOption: false,
      describe: 'Use local mode',
    },
    'force-clean': {
      type: 'boolean',
      demandOption: false,
      describe: 'Force clean the database, dropping project schemas and tables',
    },
    unsafe: {
      type: 'boolean',
      demandOption: false,
      describe: 'Allows usage of any built-in module within the sandbox',
    },
    'batch-size': {
      demandOption: false,
      describe: 'Batch size of blocks to fetch in one round',
      type: 'number',
    },
    timeout: {
      demandOption: false,
      describe: 'Timeout for indexer sandbox to execute the mapping functions',
      type: 'number',
    },
    debug: {
      demandOption: false,
      describe:
        'Show debug information to console output. will forcefully set log level to debug',
      type: 'boolean',
      default: false,
    },
    profiler: {
      demandOption: false,
      describe: 'Show profiler information to console output',
      type: 'boolean',
      default: false,
    },
    'network-endpoint': {
      demandOption: false,
      type: 'string',
      describe: 'Blockchain network endpoint to connect',
    },
    'output-fmt': {
      demandOption: false,
      describe: 'Print log as json or plain text',
      type: 'string',
      choices: ['json', 'colored'],
    },
    'log-level': {
      demandOption: false,
      describe: 'Specify log level to print. Ignored when --debug is used',
      type: 'string',
      choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    },
    migrate: {
      demandOption: false,
      describe: 'Migrate db schema (for management tables only)',
      type: 'boolean',
      default: false,
    },
    'timestamp-field': {
      demandOption: false,
      describe: 'Enable/disable created_at and updated_at in schema',
      type: 'boolean',
      default: false,
    },
    'network-dictionary': {
      alias: 'd',
      demandOption: false,
      describe: 'Specify the dictionary api for this network',
      type: 'string',
    },
    'mmr-path': {
      alias: 'm',
      demandOption: false,
      describe: 'Local path of the merkle mountain range (.mmr) file',
      type: 'string',
    },
    'proof-of-index': {
      demandOption: false,
      describe: 'Enable/disable proof of index',
      type: 'boolean',
      default: false,
    },
    port: {
      alias: 'p',
      demandOption: false,
      describe: 'The port the service will bind to',
      type: 'number',
      default: 3000,
    },
    chain: {
      demainOption: true,
      describe: 'Blockchain to index',
      type: 'string',
      choices: ['terra', 'polkadot'],
    },
  });
}

export function argv(arg: string): unknown {
  return getYargsOption().argv[arg];
}
