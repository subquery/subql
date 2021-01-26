// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { last } from 'lodash';
import { getYargsOption } from '../yargs';
import { IConfig, MinConfig, NodeConfig } from './NodeConfig';
import { SubqueryProject } from './project.model';

const YargsNameMapping = {
  local: 'localMode',
  'subquery-name': 'subqueryName',
  'batch-size': 'batchSize',
};

type Args = ReturnType<typeof getYargsOption>['argv'];

function yargsToIConfig(yargs: Args): Partial<IConfig> {
  return Object.entries(yargs).reduce((acc, [key, value]) => {
    acc[YargsNameMapping[key] ?? key] = value;
    return acc;
  }, {});
}

function defaultSubqueryName(config: Partial<IConfig>): MinConfig {
  return {
    ...config,
    subqueryName: config.subqueryName ?? last(config.subquery.split(path.sep)),
  } as MinConfig;
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
        console.log(
          'subquery path is missing neither in cli options nor in config file',
        );
        yargsOptions.showHelp();
        process.exit(1);
      }
      assert(argv.subquery, 'subquery path is missing');
      config = new NodeConfig(defaultSubqueryName(yargsToIConfig(argv)));
    }

    const projectPath = path.resolve(
      config.configDir && !argv.subquery ? config.configDir : '.',
      config.subquery,
    );

    const project = async () =>
      SubqueryProject.create(projectPath).catch((err) => {
        console.error(
          'Create Subquery project from given path failed!',
          err.message,
        );
        process.exit(1);
      });
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
