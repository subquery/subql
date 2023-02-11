// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync} from 'fs';
import {ConnectionOptions} from 'tls';
import {DynamicModule, Global, Module} from '@nestjs/common';
import {Pool} from 'pg';
import {getLogger} from '../utils/logger';
import {getYargsOption} from '../yargs';
import {Config} from './config';
import {debugPgClient} from './x-postgraphile/debugClient';

@Global()
@Module({})
export class ConfigureModule {
  static register(): DynamicModule {
    const {argv: opts} = getYargsOption();

    const config = new Config({
      name: opts.name,
      playground: opts.playground ?? false,
      unsafe: opts.unsafe ?? false,
    });

    const sslOption = (_config: Config) => {
      if (_config.get('DB_SSL')) {
        const sslConfig: ConnectionOptions = {
          ca: readFileSync(_config.get('DB_CA_CERT')).toString(),
          key: _config.get('DB_KEY_CERT') ? readFileSync(_config.get('DB_KEY_CERT')).toString() : undefined,
          cert: _config.get('DB_CLIENT_CERT') ? readFileSync(_config.get('DB_CLIENT_CERT')).toString() : undefined,
        };
        return sslConfig;
      }
      return false;
    };

    const pgPool = new Pool({
      user: config.get('DB_USER'),
      password: config.get('DB_PASS'),
      host: config.get('DB_HOST_READ') && !opts.subscription ? config.get('DB_HOST_READ') : config.get('DB_HOST'),
      port: config.get('DB_PORT'),
      database: config.get('DB_DATABASE'),
      max: opts['max-connection'],
      statement_timeout: opts['query-timeout'],
      ssl: sslOption(config),
    });
    pgPool.on('error', (err) => {
      // tslint:disable-next-line no-console
      getLogger('db').error('PostgreSQL client generated error: ', err.message);
    });
    if (opts['query-explain']) {
      pgPool.on('connect', (pgClient) => {
        // Enhance our Postgres client with debugging stuffs.
        debugPgClient(pgClient, getLogger('explain'));
        pgClient._explainResults = [];
      });
    }
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
