// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DynamicModule, Global} from '@nestjs/common';
import {NodeConfig} from '@subql/node-core/configure';
import {Sequelize, Options as SequelizeOption} from 'sequelize';
import * as entities from '../entities';
import {getLogger} from '../logger';
import {delay} from '../utils/promise';
// import {getYargsOption} from '../yargs';

export interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const logger = getLogger('db');

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

const sequelizeFactory = (option: SequelizeOption, migrate: any) => async () => {
  const sequelize = new Sequelize(option);
  const numRetries = 5;
  await establishConnection(sequelize, numRetries);
  for (const factoryFn of Object.keys(entities).filter((k) => /Factory$/.exec(k))) {
    entities[factoryFn as keyof typeof entities](sequelize);
  }
  // const {migrate} = getYargsOption().argv;
  await sequelize.sync({alter: migrate});
  return sequelize;
};

@Global()
export class DbModule {
  static forRoot(option: DbOption): DynamicModule {
    // const {argv} = getYargsOption();
    const logger = getLogger('db');
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: (nodeConfig: NodeConfig) =>
            sequelizeFactory(
              {
                ...option,
                dialect: 'postgres',
                logging: nodeConfig.debug
                  ? (sql: string, timing?: number) => {
                      logger.debug(sql);
                    }
                  : false,
              },
              nodeConfig.migrate
            ),
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
