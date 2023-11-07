// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { initLogger } from '@subql/node-core/logger';
import { boolean } from 'yargs';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';

export const yargsOptions = yargs(hideBin(process.argv))
  .env('SUBQL_NODE')
  .command({
    command: 'test',
    describe: 'Run tests for a SubQuery application',
    builder: {},
    handler: (argv) => {
      initLogger(
        argv.debug as string,
        argv.outputFmt as 'json' | 'colored',
        argv.logLevel as string | undefined,
      );
      // lazy import to make sure logger is instantiated before all other services
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { testingInit } = require('./subcommands/testing.init');
      return testingInit();
    },
  })
  .command({
    command: 'force-clean',
    describe:
      'Clean the database dropping project schemas and tables. Once the command is executed, the application would exit upon completion.',
    builder: {},
    handler: (argv) => {
      initLogger(
        argv.debug as string,
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
        argv.debug as string,
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
    'block-confirmations': {
      demandOption: false,
      default: 20,
      describe:
        'The number of blocks behind the head to be considered finalized, this has no effect with Ethereum',
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
      describe: `Enable debug logging for specific scopes, this will override log-level. "*" will enable debug everywhere, or comma separated strings for specific scopes. e.g. "SQL,dictionary". To disable specific scopes you can prefix them with '-'. e.g. "*,-SQL"`,
      type: 'string',
    },
    'dictionary-resolver': {
      demandOption: false,
      describe: 'Use SubQuery Network dictionary resolver',
      type: 'string',
    },
    'dictionary-timeout': {
      demandOption: false,
      describe: 'Max timeout for dictionary query',
      type: 'number',
    },
    'dictionary-query-size': {
      demandOption: false,
      describe:
        'Dictionary query max block size, this specify the block height range of the dictionary query',
      type: 'number',
    },
    'disable-historical': {
      demandOption: false,
      describe: 'Disable storing historical state entities',
      type: 'boolean',
      // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
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
    'primary-network-endpoint': {
      demandOption: false,
      type: 'string',
      describe:
        'Primary blockchain endpoint, used as the first choice for connections.',
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
    'pg-ca': {
      demandOption: false,
      describe:
        'Postgres ca certificate - to enable TLS/SSL connections to your PostgreSQL, path to the server certificate file are required, e.g /path/to/server-certificates/root.crt',
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
    'store-cache-threshold': {
      demandOption: false,
      describe:
        'Store cache will flush data to the database when number of records excess this threshold',
      type: 'number',
    },
    'store-cache-upper-limit': {
      demandOption: false,
      describe:
        'Defines the upper limit to the store cache size. When this limit is reached indexing will wait for the cache to be flushed before continuing.',
      type: 'number',
    },
    'store-get-cache-size': {
      demandOption: false,
      describe: 'Store get cache size for each model',
      type: 'number',
    },
    'store-cache-async': {
      demandOption: false,
      describe:
        'If enabled the store cache will flush data asyncronously relative to indexing data',
      type: 'boolean',
    },
    'store-flush-interval': {
      demandOption: false,
      describe:
        'The interval, in seconds, at which data is flushed from the cache. ' +
        'This ensures that data is persisted regularly when there is either not much data or the project is up to date.',
      type: 'number',
      default: 5,
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
    skipTransactions: {
      demandOption: false,
      describe: `If the project contains only event handlers and doesn't require transaction information then this can be used to skip fetching transactions reducing bandwith and memory. This will be automatically disabled if handlers other than EventHandlers are detected.`,
      type: 'boolean',
      // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
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
      describe: 'Enable to fetch and index unfinalized blocks',
      type: 'boolean',
      // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
    },
    unsafe: {
      type: 'boolean',
      demandOption: false,
      describe: 'Allows usage of any built-in module within the sandbox',
      // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
    },
    workers: {
      alias: 'w',
      demandOption: false,
      describe:
        'Number of worker threads to use for fetching and processing blocks. Disabled by default.',
      type: 'number',
    },
    root: {
      describe:
        'This is a hidden flag only used from the main thread to workers. It provides a root directory for the project. This is a temp directory with IPFS and GitHub projects.',
      type: 'string',
    },
    'query-address-limit': {
      describe:
        'Set the limit for address on dictionary queries for dynamic datasources',
      type: 'number',
      default: 100,
    },
  })
  .hide('root'); // root is hidden because its for internal use
