// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import path from 'path';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { last } from 'lodash';
import { getYargsOption } from '../yargs';
import { NodeConfig } from './NodeConfig';
import { SubqueryProject } from './project.model';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const yargsOptions = getYargsOption();
    const { argv } = yargsOptions;
    let config: NodeConfig;
    if (argv.config) {
      config = NodeConfig.fromFile(argv.config);
      config.merge({
        subquery: argv.subquery,
        subqueryName: argv['subquery-name'],
      });
    } else {
      if (!argv.subquery) {
        console.log(
          'subquery path is missing neither in cli options nor in config file',
        );
        yargsOptions.showHelp();
        process.exit(1);
      }
      assert(argv.subquery, 'subquery path is missing');
      config = new NodeConfig({
        subquery: argv.subquery,
        subqueryName:
          argv['subquery-name'] ?? last(argv.subquery.split(path.sep)),
        localMode: argv.local,
      });
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
