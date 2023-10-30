// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DynamicModule, Global} from '@nestjs/common';
import {Sequelize, Options as SequelizeOption} from '@subql/x-sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';
import {delay} from '../utils/promise';

export interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  timezone: string;
}

const logger = getLogger('db');

const DEFAULT_DB_OPTION: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  timezone: 'utc',
};

const CONNECTION_SSL_ERROR_REGEX = 'not support SSL';

async function establishConnectionSequelize(option: SequelizeOption, numRetries: number): Promise<Sequelize> {
  const uri = `postgresql://${option.username}:${option.password}@${option.host}:${option.port}/${option.database}`;

  const sequelize = new Sequelize(uri, option);
  try {
    await sequelize.authenticate();
  } catch (error: any) {
    if (JSON.stringify(error.message).includes(CONNECTION_SSL_ERROR_REGEX)) {
      logger.warn('Database does not support SSL connection, will try to connect without it');
      option.dialectOptions = undefined;
    }
    if (numRetries > 0) {
      await delay(3);
      return establishConnectionSequelize(option, numRetries - 1);
    } else {
      logger.error(error, 'Unable to connect to the database');
      process.exit(1);
    }
  }
  return sequelize;
}

const sequelizeFactory = (option: SequelizeOption) => async () => {
  const numRetries = 5;
  const sequelize = await establishConnectionSequelize(option, numRetries);
  await sequelize.sync();
  return sequelize;
};

const buildSequelizeOptions = (nodeConfig: NodeConfig, option: DbOption): SequelizeOption => {
  const logger = getLogger('SQL');

  return {
    ...option,
    dialect: 'postgres',
    ssl: nodeConfig.isPostgresSecureConnection,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false,
        ca: nodeConfig.postgresCACert,
        key: nodeConfig.postgresClientKey,
        cert: nodeConfig.postgresClientCert,
      },
    },
    logging: (sql: string, timing?: number) => {
      logger.debug(sql);
    },
  };
};

export async function establishNewSequelize(nodeConfig: NodeConfig): Promise<Sequelize> {
  return sequelizeFactory(buildSequelizeOptions(nodeConfig, DEFAULT_DB_OPTION))();
}

@Global()
export class DbModule {
  static forRootWithConfig(nodeConfig: NodeConfig, option: DbOption = DEFAULT_DB_OPTION): DynamicModule {
    const factory = sequelizeFactory(buildSequelizeOptions(nodeConfig, option))();

    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: () => factory,
        },
      ],
      exports: [Sequelize],
    };
  }

  static forRoot(option: DbOption = DEFAULT_DB_OPTION): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: (nodeConfig: NodeConfig) => sequelizeFactory(buildSequelizeOptions(nodeConfig, option))(),
          inject: [NodeConfig],
        },
      ],
      exports: [Sequelize],
    };
  }

  static forFeature(models: string[]): DynamicModule {
    return {
      module: DbModule,
      providers: models.map((model) => ({
        provide: model,
        inject: [Sequelize],
        useFactory: (sequelize: Sequelize) => sequelize.model(model),
      })),
      exports: models,
    };
  }
}
