// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import assert from 'assert';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { last } from 'lodash';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { loadProjectManifest } from '@subql/common';
import { SubqueryProject } from './project.model';
import { NodeConfig } from './NodeConfig';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const yargsOptions = yargs(hideBin(process.argv)).options({
      subquery: {
        alias: 'f',
        demandOption: false,
        describe: 'the local path of subquery project',
        type: 'string',
      },
      'subquery-name': {
        demandOption: false,
        describe: 'name of the subquery project',
        type: 'string',
      },
      config: {
        alias: 'c',
        demandOption: false,
        describe: 'specify configuration file',
        type: 'string',
      },
    });
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
      });
    }

    const projectPath = path.resolve(
      config.configDir && !argv.subquery ? config.configDir : '.',
      config.subquery,
    );

    const project = async () =>
      SubqueryProject.create(projectPath).catch((err) => {
        console.error('Create Subquery project from given path failed !', err);
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
