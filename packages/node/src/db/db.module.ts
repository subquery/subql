// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DynamicModule, Global } from '@nestjs/common';
import * as entities from '@subql/common-node/entities';
import { Sequelize, Options as SequelizeOption } from 'sequelize';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { getYargsOption } from '../yargs';

export interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const logger = getLogger('db');

async function establishConnection(
  sequelize: Sequelize,
  numRetries: number,
): Promise<void> {
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
  for (const factoryFn of Object.keys(entities).filter((k) =>
    /Factory$/.exec(k),
  )) {
    entities[factoryFn](sequelize);
  }
  const { migrate } = getYargsOption().argv;
  await sequelize.sync({ alter: migrate });
  return sequelize;
};

@Global()
export class DbModule {
  static forRoot(option: DbOption): DynamicModule {
    const { argv } = getYargsOption();
    const logger = getLogger('db');
    return {
      module: DbModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: sequelizeFactory({
            ...option,
            dialect: 'postgres',
            logging: argv.debug
              ? (sql: string, timing?: number) => {
                  logger.debug(sql);
                }
              : false,
          }),
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
