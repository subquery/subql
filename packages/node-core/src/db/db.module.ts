// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DynamicModule, Global} from '@nestjs/common';
import {Sequelize, Options as SequelizeOption} from 'sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';
import {delay} from '../utils/promise';

export interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

const logger = getLogger('db');

const DEFAULT_DB_OPTION: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  ssl: process.env.DB_SSL ? process.env.DB_SSL === 'true' : false,
};

async function establishConnection(sequelize: Sequelize, numRetries: number): Promise<void> {
  try {
    await sequelize.authenticate();
  } catch (error) {
    logger.error(error, 'Unable to connect to the database');
    if (numRetries > 0) {
      await delay(3);
      void (await establishConnection(sequelize, numRetries - 1));
    } else {
      process.exit(1);
    }
  }
}

const sequelizeFactory = (option: SequelizeOption) => async () => {
  const sequelize = new Sequelize(option);
  const numRetries = 5;
  await establishConnection(sequelize, numRetries);
  await sequelize.sync();
  return sequelize;
};

@Global()
export class DbModule {
  static forRootWithConfig(nodeConfig: NodeConfig, option: DbOption = DEFAULT_DB_OPTION): DynamicModule {
    const logger = getLogger('db');
    const factory = sequelizeFactory({
      ...option,
      dialect: 'postgres',
      ssl: nodeConfig.isPostgresSecureConnection,
      dialectOptions: {
        ssl: {
          ca: nodeConfig.postgresCACert,
          key: nodeConfig.postgresClientKey ?? '',
          cert: nodeConfig.postgresClientCert ?? '',
        },
      },
      logging: nodeConfig.debug
        ? (sql: string, timing?: number) => {
            logger.debug(sql);
          }
        : false,
    })();

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
    const logger = getLogger('db');
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: (nodeConfig: NodeConfig) =>
            sequelizeFactory({
              ...option,
              dialect: 'postgres',
              ssl: nodeConfig.isPostgresSecureConnection,
              dialectOptions: {
                ssl: {
                  ca: nodeConfig.postgresCACert,
                  key: nodeConfig.postgresClientKey,
                  cert: nodeConfig.postgresClientCert,
                },
              },
              logging: nodeConfig.debug
                ? (sql: string, timing?: number) => {
                    logger.debug(sql);
                  }
                : false,
            })(),
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
