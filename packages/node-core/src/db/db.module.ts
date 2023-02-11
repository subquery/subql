// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync} from 'fs';
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
  dialectOptions?: {
    ssl?: {
      ca: string;
      cert?: string;
      key?: string;
    };
  };
}

const logger = getLogger('db');

const DEFAULT_DB_OPTION: DbOption = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'postgres',
  ssl: process.env.DB_SSL === 'true' ?? false,
};

/** Adding the ssl option to the sequelize option. If the ssl is enabled ,
USER should provide the path as environment variable
- DB_CA_CERT: path to the CA file (Required)
- DB_KEY_CERT: path to the KEY file (Optional)
- DB_CLIENT_CERT: path to the CERT file (Optional)
@return the option with ssl option
@exception throw error if the ssl is enabled but there is not correct file path
*/
const dbOptionWithSSLOptions = (option: DbOption): DbOption => {
  if (option.ssl) {
    const ca_content = readFileSync(process.env.DB_CA_CERT).toString();
    let key_content = '';
    let cert_content = '';

    if (process.env.DB_KEY_CERT) {
      key_content = readFileSync(process.env.DB_KEY_CERT).toString();
    }

    if (process.env.DB_CLIENT_CERT) {
      cert_content = readFileSync(process.env.DB_CLIENT_CERT).toString();
    }

    option.dialectOptions = {
      ssl: {
        ca: ca_content,
        key: key_content,
        cert: cert_content,
      },
    };
    return option;
  }

  return option;
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
    option = dbOptionWithSSLOptions(option);
    const factory = sequelizeFactory({
      ...option,
      dialect: 'postgres',
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
    option = dbOptionWithSSLOptions(option);
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: (nodeConfig: NodeConfig) =>
            sequelizeFactory({
              ...option,
              dialect: 'postgres',
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
