// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { initLogger } from '@subql/node-core/logger';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

export const yargsOptions = yargs(hideBin(process.argv))
  .env('SUBQL_NODE')
  .command({
    command: 'force-clean',
    describe:
      'Clean the database dropping project schemas and tables. Once the command is executed, the application would exit upon completion.',
    builder: {},
    handler: (argv) => {
      initLogger(
        argv.debug as boolean,
        argv.outputFmt as 'json' | 'colored',
        argv.logLevel as string | undefined,
      );

      // lazy import to make sure logger is instantiated before all other services
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { forceCleanInit } = require('./subcommands/forceClean.init');
      return forceCleanInit();
    },
  })
  .command({
    command: 'reindex',
    describe:
      'Reindex to specified block height. Historical must be enabled for the targeted project (--disable-historical=false). Once the command is executed, the application would exit upon completion.',
    builder: (yargs) =>
      yargs.options('targetHeight', {
        type: 'number',
        description: 'set targetHeight',
        require: true,
      }),
    handler: (argv) => {
      initLogger(
        argv.debug as boolean,
        argv.outputFmt as 'json' | 'colored',
        argv.logLevel as string | undefined,
      );
      // lazy import to make sure logger is instantiated before all other services
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { reindexInit } = require('./subcommands/reindex.init');
      return reindexInit(argv.targetHeight);
    },
  })
  .options({
    'batch-size': {
      demandOption: false,
      describe: 'Batch size of blocks to fetch in one round',
      type: 'number',
    },
    config: {
      alias: 'c',
      demandOption: false,
      describe: 'Specify configuration file',
      type: 'string',
    },
    'db-schema': {
      demandOption: false,
      describe: 'Db schema name of the project',
      type: 'string',
    },
    debug: {
      demandOption: false,
      describe:
        'Show debug information to console output. will forcefully set log level to debug',
      type: 'boolean',
      default: false,
    },
    'dictionary-timeout': {
      demandOption: false,
      describe: 'Max timeout for dictionary query',
      type: 'number',
    },
    'disable-historical': {
      demandOption: false,
      default: false,
      describe: 'Disable storing historical state entities',
      type: 'boolean',
    },
    ipfs: {
      demandOption: false,
      describe: 'IPFS gateway endpoint',
      type: 'string',
    },
    local: {
      deprecated: true,
      type: 'boolean',
      demandOption: false,
      describe: 'Use local mode',
    },
    'log-level': {
      demandOption: false,
      describe: 'Specify log level to print. Ignored when --debug is used',
      type: 'string',
      choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    },
    'mmr-path': {
      alias: 'm',
      demandOption: false,
      describe: 'Local path of the merkle mountain range (.mmr) file',
      type: 'string',
    },
    'multi-chain': {
      demandOption: false,
      default: false,
      describe:
        'Enables indexing multiple subquery projects into the same database schema',
      type: 'boolean',
    },
    'network-dictionary': {
      alias: 'd',
      demandOption: false,
      describe: 'Specify the dictionary api for this network',
      type: 'string',
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
    port: {
      alias: 'p',
      demandOption: false,
      describe: 'The port the service will bind to',
      type: 'number',
    },
    profiler: {
      demandOption: false,
      describe: 'Show profiler information to console output',
      type: 'boolean',
      default: false,
    },
    'proof-of-index': {
      demandOption: false,
      describe: 'Enable/disable proof of index',
      type: 'boolean',
      default: false,
    },
    'query-limit': {
      demandOption: false,
      describe:
        'The limit of items a project can query with store.getByField at once',
      type: 'number',
      default: 100,
    },
    'scale-batch-size': {
      type: 'boolean',
      demandOption: false,
      describe: 'scale batch size based on memory usage',
      default: false,
    },
    'sponsored-dictionary': {
      demandOption: false,
      describe: 'Use subquery network sponsored dictionary',
      type: 'boolean',
      default: false,
    },
    subquery: {
      alias: 'f',
      demandOption: true,
      default: process.cwd(),
      describe: 'Local path or IPFS cid of the subquery project',
      type: 'string',
    },
    'subquery-name': {
      deprecated: true,
      demandOption: false,
      describe: 'Name of the subquery project',
      type: 'string',
    },
    subscription: {
      demandOption: false,
      describe: 'Enable subscription by create notification triggers',
      type: 'boolean',
      default: false,
    },
    timeout: {
      demandOption: false,
      describe: 'Timeout for indexer sandbox to execute the mapping functions',
      type: 'number',
    },
    'timestamp-field': {
      demandOption: false,
      describe: 'Enable/disable created_at and updated_at in schema',
      type: 'boolean',
      default: false,
    },
    'unfinalized-blocks': {
      demandOption: false,
      default: false,
      describe: 'Enable to fetch and index unfinalized blocks',
      type: 'boolean',
    },
    unsafe: {
      type: 'boolean',
      demandOption: false,
      describe: 'Allows usage of any built-in module within the sandbox',
    },
    workers: {
      alias: 'w',
      demandOption: false,
      describe:
        'Number of worker threads to use for fetching and processing blocks. Disabled by default.',
      type: 'number',
    },
    'pg-ca': {
      demandOption: false,
      describe:
        'Postgres ca certificate - to enables TLS/SSL connections to your PostgreSQL, path to the server certificate file are required, e.g /path/to/server-certificates/root.crt',
      type: 'string',
    },
    'pg-key': {
      demandOption: false,
      describe:
        'Postgres client key - Path to key file e.g /path/to/client-key/postgresql.key',
      type: 'string',
    },
    'pg-cert': {
      demandOption: false,
      describe:
        'Postgres client certificate - Path to client certificate e.g /path/to/client-certificates/postgresql.crt',
      type: 'string',
    },
  });
