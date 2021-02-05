// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DynamicModule, Global, Module} from '@nestjs/common';
import {Pool} from 'pg';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {Config} from './config';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const opts = yargs(hideBin(process.argv)).options({
      name: {
        alias: 'n',
        describe: 'project name',
        type: 'string',
        demandOption: false,
      },
      playground: {
        describe: 'enable graphql playground',
        type: 'boolean',
        demandOption: false,
      },
    }).argv;

    const config = new Config({
      name: opts.name,
      playground: opts.playground ?? false,
    });

    const pgPool = new Pool({
      user: config.get('DB_USER'),
      password: config.get('DB_PASS'),
      host: config.get('DB_HOST'),
      port: config.get('DB_PORT'),
      database: config.get('DB_DATABASE'),
    });
    pgPool.on('error', (err) => {
      // tslint:disable-next-line no-console
      console.error('PostgreSQL client generated error: ', err.message);
    });

    return {
      module: ConfigureModule,
      providers: [
        {
          provide: Config,
          useValue: config,
        },
        {
          provide: Pool,
          useValue: pgPool,
        },
      ],
      exports: [Config, Pool],
    };
  }
}
