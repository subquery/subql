// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DynamicModule, Global, Module} from '@nestjs/common';
import {Pool} from 'pg';
import {getLogger} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {Config} from './config';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const {argv: opts} = getYargsOption();

    const config = new Config({
      name: opts.name,
      playground: opts.playground ?? false,
    });

    const pgPool = new Pool({
      user: config.get('DB_USER'),
      password: config.get('DB_PASS'),
      host: config.get('DB_HOST_READ') ?? config.get('DB_HOST'),
      port: config.get('DB_PORT'),
      database: config.get('DB_DATABASE'),
    });
    pgPool.on('error', (err) => {
      // tslint:disable-next-line no-console
      getLogger('db').error('PostgreSQL client generated error: ', err.message);
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
