// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { last } from 'lodash';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { loadProjectManifest } from '@subql/common';
import { SubqueryProject } from './project.model';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const argv = yargs(hideBin(process.argv)).options({
      subquery: {
        alias: 'f',
        demandOption: true,
        describe: 'the local path of subquery project',
        type: 'string',
      },
      'subquery-name': {
        demandOption: false,
        describe: 'name of the subquery project',
        type: 'string',
      },
    }).argv;
    const projectPath = path.resolve(argv.subquery);
    return {
      module: ConfigureModule,
      providers: [
        {
          provide: 'SUBQUERY_PROJECT_NAME',
          useValue: argv['subquery-name'] ?? last(projectPath.split(path.sep)),
        },
        {
          provide: SubqueryProject,
          useValue: SubqueryProject.create(
            loadProjectManifest(projectPath),
            projectPath,
          ),
        },
      ],
      exports: ['SUBQUERY_PROJECT_NAME', SubqueryProject],
    };
  }
}
