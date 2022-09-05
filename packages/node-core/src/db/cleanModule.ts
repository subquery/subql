// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {DynamicModule, Global} from '@nestjs/common';
import {Sequelize} from 'sequelize';
import {Options as SequelizeOption} from 'sequelize/types/sequelize';
import * as entities from '../entities/index';
import {delay} from '../utils/promise';

interface DbOption {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

async function establishConnection(sequelize: Sequelize, numRetries: number): Promise<void> {
  try {
    await sequelize.authenticate();
  } catch (error) {
    console.log(error, 'Unable to connect to the database');
    if (numRetries > 0) {
      await delay(3);
      void (await establishConnection(sequelize, numRetries - 1));
    } else {
      process.exit(1);
    }
  }
}

const sequalizeCleanFactory = (option: SequelizeOption) => async () => {
  const sequelize = new Sequelize(option);
  const numRetries = 5;
  await establishConnection(sequelize, numRetries);
  for (const factoryFn of Object.keys(entities).filter((k) => /Factory$/.exec(k))) {
    entities[factoryFn as keyof typeof entities](sequelize);
  }
  // const {migrate} = getYargsOption().argv;
  // await sequelize.sync({alter: migrate});
  return sequelize;
};

@Global()
export class CleanModule {
  static connectDB(option: DbOption): DynamicModule {
    return {
      module: CleanModule,
      providers: [
        {
          provide: Sequelize,
          useFactory: sequalizeCleanFactory({
            ...option,
            dialect: 'postgres',
            logging: false,
          }),
        },
      ],
      exports: [Sequelize],
    };
  }
}
