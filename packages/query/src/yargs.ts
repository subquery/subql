// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {argv as yargv} from 'yargs';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getYargsOption() {
  return yargs(hideBin(process.argv))
    .env('SUBQL_QUERY')
    .options({
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
      'playground-settings': {
        demandOption: false,
        describe: 'Pass the settings to the graphql playground (JSON format)',
        type: 'string',
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
      'query-limit': {
        demandOption: false,
        describe: 'Set limit on query depth',
        type: 'number',
        default: 100,
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
        default: 10,
      },
      'query-timeout': {
        demandOption: false,
        describe: 'Query timeout in milliseconds',
        type: 'number',
        default: 10000,
      },
      'query-explain': {
        demandOption: false,
        describe: 'Explain query in SQL statement',
        type: 'boolean',
      },
      aggregate: {
        demandOption: false,
        default: true,
        describe: 'Enable aggregate feature',
        type: 'boolean',
      },
      'disable-hot-schema': {
        demandOption: false,
        describe: 'Hot reload schema on schema-changes',
        type: 'boolean',
        default: false,
      },
      'pg-ca': {
        demandOption: false,
        describe:
          'Postgres ca certificate - to enables TLS/SSL connections to your PostgreSQL, path to the server certificate file are required, e.g /path/to/server-certificates/root.crt',
        type: 'string',
      },
      'pg-key': {
        demandOption: false,
        describe: 'Postgres client key - Path to key file e.g /path/to/client-key/postgresql.key',
        type: 'string',
      },
      'pg-cert': {
        demandOption: false,
        describe:
          'Postgres client certificate - Path to client certificate e.g /path/to/client-certificates/postgresql.crt',
        type: 'string',
      },
      'dictionary-optimisation': {
        demandOption: false,
        describe: 'Dictionary optimisation',
        type: 'boolean',
        default: false,
      },
    });
}

export function argv(arg: string): unknown {
  return getYargsOption().argv[arg];
}
