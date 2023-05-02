// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { Reader, ReaderFactory } from '@subql/common';
import { SubstrateProjectNetworkConfig } from '@subql/common-substrate';
import {
  IConfig,
  NodeConfig,
  getLogger,
  setLevel,
  rebaseArgsWithManifest,
  defaultSubqueryName,
} from '@subql/node-core';
import { camelCase, last, omitBy, isNil } from 'lodash';
import { yargsOptions } from '../yargs';
import { SubqueryProject } from './SubqueryProject';

const logger = getLogger('configure');

const YargsNameMapping: Record<string, string> = {};

type Args = typeof yargsOptions.argv['argv'];

function yargsToIConfig(yargs: Args): Partial<IConfig> {
  return Object.entries(yargs).reduce((acc, [key, value]) => {
    if (['_', '$0'].includes(key)) return acc;

    if (key === 'network-registry') {
      try {
        value = JSON.parse(value as string);
      } catch (e) {
        throw new Error('Argument `network-registry` is not valid JSON');
      }
    }
    acc[YargsNameMapping[key] ?? camelCase(key)] = value;
    return acc;
  }, {} as any);
}

// Check if a subquery name is a valid schema name
export function validDbSchemaName(name: string): boolean {
  if (name.length === 0) {
    return false;
  } else {
    name = name.toLowerCase();
    const regexp = new RegExp('^[a-zA-Z_][a-zA-Z0-9_\\-\\/]{0,62}$');
    const flag0 = !name.startsWith('pg_'); // Reserved identifier
    const flag1 = regexp.test(name); // <= Valid characters, less than 63 bytes
    if (!flag0) {
      logger.error(
        `Invalid schema name '${name}', schema name must not be prefixed with 'pg_'`,
      );
    }
    if (!flag1) {
      logger.error(
        `Invalid schema name '${name}', schema name must start with a letter or underscore, 
         be less than 63 bytes and must contain only valid alphanumeric characters (can include characters '_-/')`,
      );
    }
    return flag0 && flag1;
  }
}

function warnDeprecations() {
  const { argv } = yargsOptions;
  if (argv['subquery-name']) {
    logger.warn(
      'Note that argument --subquery-name has been deprecated in favour of --db-schema',
    );
  }
  if (argv.local) {
    logger.warn('Note that argument --local has been deprecated');
  }
}

@Global()
@Module({})
export class ConfigureModule {
  static async register(): Promise<DynamicModule> {
    const { argv } = yargsOptions;
    let config: NodeConfig;
    let rawManifest: unknown;
    let reader: Reader;

    // Override order : Sub-command/Args/Flags > Manifest Runner options > Default configs
    // Therefore, we should rebase the manifest runner options with args first but not the config in the end
    if (argv.config) {
      // get manifest options
      config = NodeConfig.fromFile(argv.config, yargsToIConfig(argv));
      reader = await ReaderFactory.create(config.subquery, {
        ipfs: config.ipfs,
      });
      rawManifest = await reader.getProjectSchema();
      rebaseArgsWithManifest(argv, rawManifest);
      // use rebased argv generate config to override current config
      config = NodeConfig.rebaseWithArgs(config, yargsToIConfig(argv));
    } else {
      if (!argv.subquery) {
        logger.error(
          'Subquery path is missing neither in cli options nor in config file',
        );
        yargsOptions.showHelp();
        process.exit(1);
      }

      warnDeprecations();
      assert(argv.subquery, 'subquery path is missing');
      reader = await ReaderFactory.create(argv.subquery, {
        ipfs: argv.ipfs,
      });
      rawManifest = await reader.getProjectSchema();
      rebaseArgsWithManifest(argv, rawManifest);
      // Create new nodeConfig with rebased argv
      config = new NodeConfig(defaultSubqueryName(yargsToIConfig(argv)));
    }

    if (!validDbSchemaName(config.dbSchema)) {
      process.exit(1);
    }

    if (config.debug) {
      setLevel('debug');
    }

    const project = async () => {
      const p = await SubqueryProject.create(
        argv.subquery,
        rawManifest,
        reader,
        omitBy<SubstrateProjectNetworkConfig>(
          {
            endpoint: config.networkEndpoints,
            dictionary: config.networkDictionary,
          },
          isNil,
        ),
      ).catch((err) => {
        logger.error(err, 'Create Subquery project from given path failed!');
        process.exit(1);
      });
      return p;
    };

    return {
      module: ConfigureModule,
      providers: [
        {
          provide: NodeConfig,
          useValue: config,
        },
        {
          provide: 'ISubqueryProject',
          useFactory: project,
        },
      ],
      exports: [NodeConfig, 'ISubqueryProject'],
    };
  }
}
