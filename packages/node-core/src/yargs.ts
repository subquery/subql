// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import yargs, {example} from 'yargs';
import {hideBin} from 'yargs/helpers';
import {initLogger} from './logger';

type YargsOptions<RootO extends Record<string, yargs.Options>, RunO extends Record<string, yargs.Options>> = {
  /**
   * Invoked with testing command
   * */
  initTesting: () => void;
  /**
   * Invoked with force-clean command
   * */
  initForceClean: () => void;
  /**
   * Invoked with reindex command
   * */
  initReindex: (targetHeight: number) => void;
  /**
   * Extra options to be added to all commands
   * */
  rootOptions?: RootO;
  /**
   *  Extra options to be added to the main/default command
   * */
  runOptions?: RunO;
};

// Unable to properly type this, TS seems to resolve the correct type already
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function yargsBuilder<
  RootO extends Record<string, yargs.Options> = Record<string, never>,
  RunO extends Record<string, yargs.Options> = Record<string, never>,
>(options: YargsOptions<RootO, RunO>) {
  return (
    yargs(hideBin(process.argv))
      .env('SUBQL_NODE')
      .command({
        command: 'test',
        describe: 'Run tests for a SubQuery application',
        builder: {},
        handler: (argv) => {
          initLogger(argv.debug as string, argv.outputFmt as 'json' | 'colored', argv.logLevel as string | undefined);
          return options.initTesting();
        },
      })
      .command({
        command: 'force-clean',
        describe:
          'Clean the database dropping project schemas and tables. Once the command is executed, the application would exit upon completion.',
        builder: {},
        handler: (argv) => {
          initLogger(argv.debug as string, argv.outputFmt as 'json' | 'colored', argv.logLevel as string | undefined);

          return options.initForceClean();
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
          initLogger(argv.debug as string, argv.outputFmt as 'json' | 'colored', argv.logLevel as string | undefined);
          return options.initReindex(argv.targetHeight);
        },
      })
      // Note we must have default command $0 at last to avoid override
      .command({
        command: '$0', //default command
        describe: 'Index a SubQuery application',
        builder: (yargs) =>
          yargs
            .options({
              ...options.runOptions,
              'batch-size': {
                demandOption: false,
                describe: 'Batch size of blocks to fetch in one round',
                type: 'number',
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
              'dictionary-registry': {
                demandOption: false,
                describe: 'Url to a dictionary registry used to resolve dictionary if one is not provided',
                type: 'string',
              },
              'disable-historical': {
                demandOption: false,
                describe: 'Disable storing historical state entities',
                type: 'boolean',
                // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
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
                describe: 'Enables indexing multiple subquery projects into the same database schema',
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
                describe: 'Primary blockchain endpoint, used as the first choice for connections.',
              },
              'network-endpoint-config': {
                demandOption: false,
                type: 'string',
                describe: 'A json encoded string of a network endpoint configuration',

                // example: JSON.stringify({ headers: { 'api-key': '<your-api-key>'}})
              },
              'primary-network-endpoint-config': {
                demandOption: false,
                type: 'string',

                describe: 'Same as the network-endpoint.config but for the primary network endpoint',
                // example: JSON.stringify({ headers: { 'api-key': '<your-api-key>'}})
              },
              'output-fmt': {
                demandOption: false,
                describe: 'Print log as json or plain text',
                type: 'string',
                choices: ['json', 'colored'],
              },
              'query-limit': {
                demandOption: false,
                describe: 'The limit of items a project can query with store.getByField at once',
                type: 'number',
                default: 100,
              },
              'store-cache-threshold': {
                demandOption: false,
                describe: 'Store cache will flush data to the database when number of records excess this threshold',
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
                describe: 'If enabled the store cache will flush data asynchronously relative to indexing data',
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
                describe:
                  'If the project contains only event handlers and only accesses the events or block header then you can enable this option to reduce RPC requests and have a slight performance increase. This will be automatically disabled if handlers other than EventHandlers are detected.',
                type: 'boolean',
                // NOTE: don't set a default for this. It will break apply args from manifest. The default should be set in NodeConfig
              },
              timeout: {
                demandOption: false,
                describe: 'Timeout for indexer sandbox to execute the mapping functions',
                type: 'number',
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
                describe: 'Number of worker threads to use for fetching and processing blocks. Disabled by default.',
                type: 'number',
              },
              'allow-schema-migration': {
                demandOption: false,
                describe: 'Allow schema-migration to occur with project upgrades',
                type: 'boolean',
              },
              root: {
                describe:
                  'This is a hidden flag only used from the main thread to workers. It provides a root directory for the project. This is a temp directory with IPFS and GitHub projects.',
                type: 'string',
              },
              'csv-out-dir': {
                describe:
                  'Path to a directory for CSV output.  If this is not provided then data will not be output to CSV',
                type: 'string',
              },
              'monitor-out-dir': {
                describe:
                  'Path to a directory for monitor service output.  If this is not provided then data will store to default folder',
                type: 'string',
              },
              'monitor-file-size': {
                describe: 'monitor file size limit in MB ',
                type: 'number',
              },
            })
            .hide('root'), // root is hidden because its for internal use
        handler: () => {
          // boostrap trigger in main.ts
        },
      })
      // Default options, shared with all command
      .options({
        ...options.rootOptions,
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
        ipfs: {
          demandOption: false,
          describe: 'IPFS gateway endpoint',
          type: 'string',
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
          alias: 'poi',
          describe: 'Enable/disable proof of index',
          type: 'boolean',
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
          describe: 'Postgres client key - Path to key file e.g /path/to/client-key/postgresql.key',
          type: 'string',
        },
        'pg-cert': {
          demandOption: false,
          describe:
            'Postgres client certificate - Path to client certificate e.g /path/to/client-certificates/postgresql.crt',
          type: 'string',
        },
        subquery: {
          alias: 'f',
          demandOption: true,
          default: process.cwd(),
          describe: 'Local path or IPFS cid of the subquery project',
          type: 'string',
        },
      })
  );
}
