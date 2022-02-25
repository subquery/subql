// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  ProjectNetworkConfig,
  getProjectRootAndManifest,
  IPFS_REGEX,
} from '@subql/common';
import { camelCase, last, omitBy, isNil } from 'lodash';
import { getLogger, setLevel } from '../utils/logger';
import { getYargsOption } from '../yargs';
import { IConfig, MinConfig, NodeConfig } from './NodeConfig';
import { SubqueryProject } from './SubqueryProject';
const logger = getLogger('configure');

const YargsNameMapping = {
  local: 'localMode',
  'ipfs-header': 'ipfsHeaders',
};

type Args = ReturnType<typeof getYargsOption>['argv'];

function yargsToIConfig(yargs: Args): Partial<IConfig> {
  return Object.entries(yargs).reduce((acc, [key, value]) => {
    if (['_', '$0'].includes(key)) return acc;

    if (key === 'network-registry') {
      try {
        value = JSON.parse(value as string);
      } catch (e) {
        throw new Error(`Argument "${key}" is not valid JSON`);
      }
    }

    if (key === 'ipfs-header') {
      value = (value as string[]).reduce((acc, header) => {
        const [headerKey, headerValue] = header.split(':').map((v) => v.trim());
        acc[headerKey] = headerValue;

        return acc;
      }, {});
    }
    acc[YargsNameMapping[key] ?? camelCase(key)] = value;
    return acc;
  }, {});
}

function defaultSubqueryName(config: Partial<IConfig>): MinConfig {
  const ipfsMatch = config.subquery.match(IPFS_REGEX);
  return {
    ...config,
    subqueryName:
      config.subqueryName ?? ipfsMatch
        ? config.subquery.replace(IPFS_REGEX, '')
        : last(getProjectRootAndManifest(config.subquery).root.split(path.sep)),
  } as MinConfig;
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
  const yargsOptions = getYargsOption();
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
  static register(): DynamicModule {
    const yargsOptions = getYargsOption();
    const { argv } = yargsOptions;
    let config: NodeConfig;
    if (argv.config) {
      config = NodeConfig.fromFile(argv.config, yargsToIConfig(argv));
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
        omitBy<ProjectNetworkConfig>(
          {
            endpoint: config.networkEndpoint,
            dictionary: config.networkDictionary,
          },
          isNil,
        ),
        {
          ipfs: config.ipfs,
          ipfsHeaders: config.ipfsHeaders,
        },
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
          provide: SubqueryProject,
          useFactory: project,
        },
      ],
      exports: [NodeConfig, SubqueryProject],
    };
  }
}
