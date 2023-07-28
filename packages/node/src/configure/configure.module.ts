// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  handleCreateSubqueryProjectError,
  Reader,
  ReaderFactory,
} from '@subql/common';
import { EthereumProjectNetworkConfig } from '@subql/common-ethereum';
import {
  IConfig,
  NodeConfig,
  getLogger,
  setLevel,
  rebaseArgsWithManifest,
  defaultSubqueryName,
  validDbSchemaName,
} from '@subql/node-core';
import { camelCase, omitBy, isNil } from 'lodash';
import { yargsOptions } from '../yargs';
import { SubqueryProject } from './SubqueryProject';

const logger = getLogger('configure');

const YargsNameMapping: Record<string, string> = {};

type Args = (typeof yargsOptions.argv)['argv'];

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
  static async getInstance(): Promise<{
    config: NodeConfig;
    project: () => Promise<SubqueryProject>;
  }> {
    const { argv } = yargsOptions;
    let config: NodeConfig;
    let rawManifest: unknown;
    let reader: Reader;

    const isTest = argv._[0] === 'test';

    // Override order : Sub-command/Args/Flags > Manifest Runner options > Default configs
    // Therefore, we should rebase the manifest runner options with args first but not the config in the end
    if (argv.config) {
      // get manifest options
      config = NodeConfig.fromFile(argv.config, yargsToIConfig(argv), isTest);
      reader = await ReaderFactory.create(config.subquery, {
        ipfs: config.ipfs,
      });
      rawManifest = await reader.getProjectSchema();
      rebaseArgsWithManifest(argv, rawManifest);
      // use rebased argv generate config to override current config
      config = NodeConfig.rebaseWithArgs(config, yargsToIConfig(argv), isTest);
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
      config = new NodeConfig(
        defaultSubqueryName(yargsToIConfig(argv)),
        isTest,
      );
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
        omitBy<EthereumProjectNetworkConfig>(
          {
            endpoint: config.networkEndpoints,
            dictionary: config.networkDictionary,
          },
          isNil,
        ),
        config.root,
      ).catch((err) => {
        const pjson = require('../../package.json');
        handleCreateSubqueryProjectError(err, pjson, rawManifest, logger);
        process.exit(1);
      });
      return p;
    };
    return { config, project };
  }
  static async register(): Promise<DynamicModule> {
    const { config, project } = await ConfigureModule.getInstance();

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
